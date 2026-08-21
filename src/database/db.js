import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, "stories.json");

/**
 * Read all stories from the JSON database.
 * @returns {Promise<Array<{name: string, chapter: number}>>}
 */
export async function getAllStories() {
  const data = await readFile(DB_PATH, "utf-8");
  return JSON.parse(data);
}

/**
 * Write the full stories array to the JSON database.
 * @param {Array<{name: string, chapter: number}>} stories
 */
async function saveStories(stories) {
  await writeFile(DB_PATH, JSON.stringify(stories, null, 2), "utf-8");
}

/**
 * Find a story by name (case-insensitive).
 * @param {string} name
 * @returns {Promise<{name: string, chapter: number} | undefined>}
 */
export async function findStory(name) {
  const stories = await getAllStories();
  return stories.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Add a new story. Returns false if a story with that name already exists.
 * @param {string} name
 * @param {number} chapter
 * @returns {Promise<boolean>}
 */
export async function addStory(name, chapter) {
  const stories = await getAllStories();
  const exists = stories.some(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) return false;

  stories.push({ name, chapter });
  await saveStories(stories);
  return true;
}

/**
 * Update an existing story's chapter. Returns false if not found.
 * @param {string} name
 * @param {number} chapter
 * @returns {Promise<boolean>}
 */
export async function updateStory(name, chapter) {
  const stories = await getAllStories();
  const index = stories.findIndex(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  if (index === -1) return false;

  stories[index].chapter = chapter;
  await saveStories(stories);
  return true;
}

/**
 * Delete a specific story by name. Returns false if not found.
 * @param {string} name
 * @returns {Promise<boolean>}
 */
export async function deleteStory(name) {
  const stories = await getAllStories();
  const index = stories.findIndex(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  if (index === -1) return false;

  stories.splice(index, 1);
  await saveStories(stories);
  return true;
}

/**
 * Delete all stories.
 * @returns {Promise<void>}
 */
export async function deleteAllStories() {
  await saveStories([]);
}
