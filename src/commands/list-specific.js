import { findStory } from "../database/postgresql/db.js";

/**
 * Handle the LIST_SPECIFIC command.
 * @param {number|string|bigint} userId
 * @param {{name: string}} params
 * @returns {Promise<string>} response message
 */
export async function handleListSpecific(userId, { name }) {
  const story = await findStory(userId, name);

  if (!story) {
    return `I couldn't find a story named "${name}".`;
  }

  return `📖 ${story.name} — Chapter ${story.chapter}`;
}
