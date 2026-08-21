import { getAllStories } from "../database/db.js";

/**
 * Handle the LIST_ALL command.
 * @returns {Promise<string>} response message
 */
export async function handleListAll() {
  const stories = await getAllStories();

  if (stories.length === 0) {
    return "📭 No stories saved yet.";
  }

  const lines = stories.map(
    (s, i) => `${i + 1}. ${s.name} — Chapter ${s.chapter}`
  );

  return `📚 Your stories:\n\n${lines.join("\n")}`;
}
