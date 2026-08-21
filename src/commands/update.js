import { updateStory } from "../database/postgresql/db.js";

/**
 * Handle the UPDATE command.
 * @param {{name: string, chapter: number}} params
 * @returns {Promise<string>} response message
 */
export async function handleUpdate({ name, chapter }) {
  const updated = await updateStory(name, chapter);

  if (!updated) {
    return `I couldn't find a story named "${name}".`;
  }

  return `✅ Updated "${name}" to chapter ${chapter}.`;
}
