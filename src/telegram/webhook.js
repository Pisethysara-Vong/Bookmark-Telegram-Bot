import { Router } from "express";
import { waitUntil } from "@vercel/functions";
import { parseCommand } from "../parser/command-parser.js";
import { sendMessage } from "./telegram.service.js";
import { redis } from "../database/redis/redis.js";
import { createUser } from "../database/postgresql/db.js";
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

const getConfirmationKey = (userId) => `pending_confirmation:${userId}`;

/**
 * Builds a friendly introductory message for the /start command.
 *
 * @param {string|null} firstName
 * @returns {string}
 */
function getIntroMessage(firstName) {
  const greeting = firstName ? `Hello ${firstName}!` : "Hello!";
  return (
    `👋 ${greeting} Welcome to Bookmark Bot!\n\n` +
    `I help you track your reading progress for manga, manhwa, novels, and books.\n\n` +
    `📖 How to use:\n` +
    `• Add a bookmark: "Add Survival Supremacy 10"\n` +
    `• Update progress: "Update Survival Supremacy to 12"\n` +
    `• View all bookmarks: "Show all" or "List bookmarks"\n` +
    `• View specific story: "Check Survival Supremacy"\n` +
    `• Delete a story: "Delete Survival Supremacy"\n` +
    `• Delete all stories: "Delete all"\n\n` +
    `Just send me a message in natural language and I'll take care of it!`
  );
}

/**
 * Handles pending confirmation actions (such as DELETE_ALL confirmation) stored in Redis.
 *
 * @param {number|string} chatId - The Telegram chat ID
 * @param {number|string|bigint} userId - The Telegram user ID
 * @param {string} userText - The raw user message text
 * @returns {Promise<boolean>} True if a pending action was handled, false otherwise
 */
async function handlePendingConfirmation(chatId, userId, userText) {
  const confirmationKey = getConfirmationKey(userId);
  const pendingAction = await redis.get(confirmationKey);

  if (!pendingAction) {
    return false;
  }

  if (pendingAction === "DELETE_ALL") {
    await redis.del(confirmationKey);

    if (userText.toUpperCase() === "YES") {
      const reply = await handleDeleteAll(userId);
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
 * @param {number|string|bigint} userId - The Telegram user ID
 * @param {{command: string, parameters: object}} command - Parsed command object
 * @returns {Promise<string>} Reply message to send back to the user
 */
async function executeCommand(chatId, userId, command) {
  switch (command.command) {
    case "ADD":
      return await handleAdd(userId, command.parameters);

    case "UPDATE":
      return await handleUpdate(userId, command.parameters);

    case "LIST_ALL":
      return await handleListAll(userId);

    case "LIST_SPECIFIC":
      return await handleListSpecific(userId, command.parameters);

    case "DELETE_ALL": {
      const confirmationKey = getConfirmationKey(userId);
      // Store pending confirmation in Redis with 5 min (300s) TTL
      await redis.set(confirmationKey, "DELETE_ALL", { ex: 300 });
      return deleteAllConfirmationPrompt();
    }

    case "DELETE_SPECIFIC":
      return await handleDeleteSpecific(userId, command.parameters);

    case "UNKNOWN":
    default:
      return "I don't understand that command.";
  }
}

/**
 * Orchestrates incoming user message processing:
 * 1. Upserts user in the database
 * 2. Checks /start command exception (instant reply without LLM or 'Processing...')
 * 3. Checks and handles pending confirmations
 * 4. Sends initial acknowledgement
 * 5. Parses natural language text with LLM
 * 6. Executes mapped command and replies
 *
 * @param {number|string} chatId - The Telegram chat ID
 * @param {{id: number|string, first_name?: string, username?: string}} user - Telegram user info
 * @param {string} userText - The raw user message text
 */
async function processMessage(chatId, user, userText) {
  try {
    const userId = user.id;

    // Exception for /start command: create user record and send intro immediately
    if (userText === "/start" || userText.startsWith("/start ")) {
      try {
        await createUser(userId, user.first_name, user.username);
      } catch (err) {
        console.error("Failed to create user on /start:", err.message);
      }
      await redis.del(getConfirmationKey(userId));
      await sendMessage(chatId, getIntroMessage(user.first_name));
      return;
    }

    const wasPendingHandled = await handlePendingConfirmation(chatId, userId, userText);
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

    const reply = await executeCommand(chatId, userId, command);
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
    const user = message.from || { id: chatId };
    const userText = message.text.trim();

    // Keep serverless execution alive until processing finishes
    waitUntil(processMessage(chatId, user, userText));

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook route error:", error);
  }
});
