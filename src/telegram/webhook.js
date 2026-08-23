import { Router } from "express";
import { waitUntil } from "@vercel/functions";
import { parseCommand } from "../parser/command-parser.js";
import { sendMessage } from "./telegram.service.js";
import { redis } from "../database/redis/redis.js";
import { handleAdd } from "../commands/add.js";
import { handleUpdate } from "../commands/update.js";
import { handleListAll } from "../commands/list-all.js";
import { handleListSpecific } from "../commands/list-specific.js";
import {
  handleDeleteAll,
  deleteAllConfirmationPrompt,
} from "../commands/delete-all.js";
import { handleDeleteSpecific } from "../commands/delete-specific.js";

export const webhookRouter = Router();

const getConfirmationKey = (chatId) => `pending_confirmation:${chatId}`;

/**
 * Handles pending confirmation actions (such as DELETE_ALL confirmation) stored in Redis.
 *
 * @param {number|string} chatId - The Telegram chat ID
 * @param {string} userText - The raw user message text
 * @returns {Promise<boolean>} True if a pending action was handled, false otherwise
 */
async function handlePendingConfirmation(chatId, userText) {
  const confirmationKey = getConfirmationKey(chatId);
  const pendingAction = await redis.get(confirmationKey);

  if (!pendingAction) {
    return false;
  }

  if (pendingAction === "DELETE_ALL") {
    await redis.del(confirmationKey);

    if (userText.toUpperCase() === "YES") {
      const reply = await handleDeleteAll();
      await sendMessage(chatId, reply);
    } else {
      await sendMessage(chatId, "❌ Delete cancelled.");
    }
    return true;
  }

  return false;
}

/**
 * Routes and executes the parsed command to its appropriate handler.
 *
 * @param {number|string} chatId - The Telegram chat ID
 * @param {{command: string, parameters: object}} command - Parsed command object
 * @returns {Promise<string>} Reply message to send back to the user
 */
async function executeCommand(chatId, command) {
  switch (command.command) {
    case "ADD":
      return await handleAdd(command.parameters);

    case "UPDATE":
      return await handleUpdate(command.parameters);

    case "LIST_ALL":
      return await handleListAll();

    case "LIST_SPECIFIC":
      return await handleListSpecific(command.parameters);

    case "DELETE_ALL": {
      const confirmationKey = getConfirmationKey(chatId);
      // Store pending confirmation in Redis with 5 min (300s) TTL
      await redis.set(confirmationKey, "DELETE_ALL", { ex: 300 });
      return deleteAllConfirmationPrompt();
    }

    case "DELETE_SPECIFIC":
      return await handleDeleteSpecific(command.parameters);

    case "UNKNOWN":
    default:
      return "I don't understand that command.";
  }
}

/**
 * Orchestrates incoming user message processing:
 * 1. Checks and handles pending confirmations
 * 2. Sends initial acknowledgement
 * 3. Parses natural language text with LLM
 * 4. Executes mapped command and replies
 *
 * @param {number|string} chatId - The Telegram chat ID
 * @param {string} userText - The raw user message text
 */
async function processMessage(chatId, userText) {
  try {
    const wasPendingHandled = await handlePendingConfirmation(chatId, userText);
    if (wasPendingHandled) {
      return;
    }

    // Send acknowledgement before the (slow) LLM call
    await sendMessage(chatId, "⏳ Processing...");

    let command;
    try {
      command = await parseCommand(userText);
    } catch (error) {
      console.error("Parser error:", error.message);
      await sendMessage(
        chatId,
        "Sorry, I couldn't process your request right now. Please try again."
      );
      return;
    }

    const reply = await executeCommand(chatId, command);
    await sendMessage(chatId, reply);
  } catch (error) {
    console.error("Error in processMessage:", error);
  }
}

webhookRouter.post("/webhook", (req, res) => {
  try {
    const message = req.body?.message;

    if (!message?.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const userText = message.text.trim();

    // Keep serverless execution alive until processing finishes
    waitUntil(processMessage(chatId, userText));

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook route error:", error);
  }
});
