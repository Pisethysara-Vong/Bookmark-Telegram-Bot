import { findStory } from "../database/db.js";

/**
 * Handle the LIST_SPECIFIC command.
 * @param {{name: string}} params
 * @returns {Promise<string>} response message
 */
export async function handleListSpecific({ name }) {
  const story = await findStory(name);

  if (!story) {
    return `I couldn't find a story named "${name}".`;
  }

  return `📖 ${story.name} — Chapter ${story.chapter}`;
}
