import { deleteStory } from "../database/postgresql/db.js";

/**
 * Handle the DELETE_SPECIFIC command.
 * @param {number|string|bigint} userId
 * @param {{name: string}} params
 * @returns {Promise<string>} response message
 */
export async function handleDeleteSpecific(userId, { name }) {
  const deleted = await deleteStory(userId, name);

  if (!deleted) {
    return `I couldn't find a story named "${name}".`;
  }

  return `🗑️ Deleted "${name}".`;
}
