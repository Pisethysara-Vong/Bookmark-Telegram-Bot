import { prisma } from "./prisma.js";

/**
 * Read all stories from Supabase via Prisma.
 * @returns {Promise<Array<{id: number, name: string, chapter: number}>>}
 */
export async function getAllStories() {
  return await prisma.story.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * Find a story by name (case-insensitive in PostgreSQL).
 * @param {string} name
 * @returns {Promise<{id: number, name: string, chapter: number} | null>}
 */
export async function findStory(name) {
  return await prisma.story.findFirst({
    where: {
      name: {
        contains: name,
        mode: "insensitive",
      },
    },
  });
}

/**
 * Add a new story. Returns false if a story with that name already exists.
 * @param {string} name
 * @param {number} chapter
 * @returns {Promise<boolean>}
 */
export async function addStory(name, chapter) {
  const existing = await findStory(name);
  if (existing) return false;

  await prisma.story.create({
    data: {
      name,
      chapter,
    },
  });
  return true;
}

/**
 * Update an existing story's chapter. Returns false if not found.
 * @param {string} name
 * @param {number} chapter
 * @returns {Promise<boolean>}
 */
export async function updateStory(name, chapter) {
  const existing = await findStory(name);
  if (!existing) return false;

  await prisma.story.update({
    where: { id: existing.id },
    data: { chapter },
  });
  return true;
}

/**
 * Delete a specific story by name. Returns false if not found.
 * @param {string} name
 * @returns {Promise<boolean>}
 */
export async function deleteStory(name) {
  const existing = await findStory(name);
  if (!existing) return false;

  await prisma.story.delete({
    where: { id: existing.id },
  });
  return true;
}

/**
 * Delete all stories.
 * @returns {Promise<void>}
 */
export async function deleteAllStories() {
  await prisma.story.deleteMany();
}
