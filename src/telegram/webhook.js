import { Router } from "express";
import { parseCommand } from "../parser/command-parser.js";
import { sendMessage } from "./telegram.service.js";
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

// In-memory map: chatId → pending confirmation type
const pendingConfirmations = new Map();

webhookRouter.post("/webhook", async (req, res) => {
  // Respond immediately to Telegram so it doesn't retry
  res.sendStatus(200);

  try {
    const message = req.body?.message;
    if (!message?.text) return;

    const chatId = message.chat.id;
    const userText = message.text.trim();

    // --- Check for pending DELETE_ALL confirmation ---
    if (pendingConfirmations.has(chatId)) {
      const pendingAction = pendingConfirmations.get(chatId);

      if (pendingAction === "DELETE_ALL") {
        pendingConfirmations.delete(chatId);

        if (userText.toUpperCase() === "YES") {
          const reply = await handleDeleteAll();
          await sendMessage(chatId, reply);
        } else {
          await sendMessage(chatId, "❌ Delete cancelled.");
        }
        return;
      }
    }

    // --- Parse the user message with the LLM ---
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

    // --- Route to the appropriate command handler ---
    let reply;

    switch (command.command) {
      case "ADD":
        reply = await handleAdd(command.parameters);
        break;

      case "UPDATE":
        reply = await handleUpdate(command.parameters);
        break;

      case "LIST_ALL":
        reply = await handleListAll();
        break;

      case "LIST_SPECIFIC":
        reply = await handleListSpecific(command.parameters);
        break;

      case "DELETE_ALL":
        pendingConfirmations.set(chatId, "DELETE_ALL");
        reply = deleteAllConfirmationPrompt();
        break;

      case "DELETE_SPECIFIC":
        reply = await handleDeleteSpecific(command.parameters);
        break;

      case "UNKNOWN":
      default:
        reply = "I don't understand that command.";
        break;
    }

    await sendMessage(chatId, reply);
  } catch (error) {
    console.error("Webhook error:", error);
  }
});
