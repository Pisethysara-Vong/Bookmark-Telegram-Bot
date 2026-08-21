import { deleteAllStories } from "../database/db.js";

/**
 * Handle the DELETE_ALL command (after confirmation).
 * @returns {Promise<string>} response message
 */
export async function handleDeleteAll() {
  await deleteAllStories();
  return "🗑️ All stories have been deleted.";
}

/**
 * Returns the confirmation prompt for DELETE_ALL.
 * @returns {string}
 */
export function deleteAllConfirmationPrompt() {
  return '⚠️ Are you sure you want to delete ALL stories?\nReply "YES" to confirm.';
}
