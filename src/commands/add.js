import { addStory } from "../database/postgresql/db.js";

/**
 * Handle the ADD command.
 * Rejects duplicates — tells the user to use UPDATE instead.
 * @param {number|string|bigint} userId
 * @param {{name: string, chapter: number}} params
 * @returns {Promise<string>} response message
 */
export async function handleAdd(userId, { name, chapter }) {
  const added = await addStory(userId, name, chapter);

  if (!added) {
    return `"${name}" already exists. Use UPDATE to change its chapter.`;
  }

  return `✅ Added "${name}" at chapter ${chapter}.`;
}
