import { deleteStory } from "../database/postgresql/db.js";

/**
 * Handle the DELETE_SPECIFIC command.
 * @param {{name: string}} params
 * @returns {Promise<string>} response message
 */
export async function handleDeleteSpecific({ name }) {
  const deleted = await deleteStory(name);

  if (!deleted) {
    return `I couldn't find a story named "${name}".`;
  }

  return `🗑️ Deleted "${name}".`;
}
