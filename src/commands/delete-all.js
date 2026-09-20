import { deleteAllStories } from "../database/postgresql/db.js";

/**
 * Handle the DELETE_ALL command (after confirmation).
 * @param {number|string|bigint} userId
 * @returns {Promise<string>} response message
 */
export async function handleDeleteAll(userId) {
  await deleteAllStories(userId);
  return "🗑️ All stories have been deleted.";
}

/**
 * Returns the confirmation prompt for DELETE_ALL.
 * @returns {string}
 */
export function deleteAllConfirmationPrompt() {
  return '⚠️ Are you sure you want to delete ALL stories?\nReply "YES" to confirm.';
}
