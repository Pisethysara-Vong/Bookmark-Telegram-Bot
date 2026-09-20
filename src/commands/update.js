import { updateStory } from "../database/postgresql/db.js";

/**
 * Handle the UPDATE command.
 * @param {number|string|bigint} userId
 * @param {{name: string, chapter: number}} params
 * @returns {Promise<string>} response message
 */
export async function handleUpdate(userId, { name, chapter }) {
  const updated = await updateStory(userId, name, chapter);

  if (!updated) {
    return `I couldn't find a story named "${name}".`;
  }

  return `✅ Updated "${name}" to chapter ${chapter}.`;
}
