import { prisma } from "./prisma.js";

/**
 * Create or update a user record when they start the bot via /start.
 *
 * @param {number|string|bigint} userId
 * @param {string|null} [firstName]
 * @param {string|null} [username]
 * @returns {Promise<object>}
 */
export async function createUser(userId, firstName = null, username = null) {
  const id = BigInt(userId);
  return await prisma.user.upsert({
    where: { id },
    update: {
      firstName: firstName || null,
      username: username || null,
    },
    create: {
      id,
      firstName: firstName || null,
      username: username || null,
    },
  });
}


/**
 * Read all stories for a specific user from Supabase via Prisma.
 * @param {number|string|bigint} userId
 * @returns {Promise<Array<{id: number, name: string, chapter: number}>>}
 */
export async function getAllStories(userId) {
  return await prisma.story.findMany({
    where: { userId: BigInt(userId) },
    orderBy: { name: "asc" },
  });
}

/**
 * Find a story by name for a specific user (case-insensitive in PostgreSQL).
 * @param {number|string|bigint} userId
 * @param {string} name
 * @returns {Promise<{id: number, name: string, chapter: number} | null>}
 */
export async function findStory(userId, name) {
  return await prisma.story.findFirst({
    where: {
      userId: BigInt(userId),
      name: {
        contains: name,
        mode: "insensitive",
      },
    },
  });
}

/**
 * Add a new story for a user. Returns false if a story with that name already exists for the user.
 * @param {number|string|bigint} userId
 * @param {string} name
 * @param {number} chapter
 * @returns {Promise<boolean>}
 */
export async function addStory(userId, name, chapter) {
  const id = BigInt(userId);
  const existing = await findStory(id, name);
  if (existing) return false;

  await prisma.story.create({
    data: {
      userId: id,
      name,
      chapter,
    },
  });
  return true;
}

/**
 * Update an existing story's chapter for a user. Returns false if not found.
 * @param {number|string|bigint} userId
 * @param {string} name
 * @param {number} chapter
 * @returns {Promise<boolean>}
 */
export async function updateStory(userId, name, chapter) {
  const id = BigInt(userId);
  const existing = await findStory(id, name);
  if (!existing) return false;

  await prisma.story.update({
    where: { id: existing.id },
    data: { chapter },
  });
  return true;
}

/**
 * Delete a specific story by name for a user. Returns false if not found.
 * @param {number|string|bigint} userId
 * @param {string} name
 * @returns {Promise<boolean>}
 */
export async function deleteStory(userId, name) {
  const id = BigInt(userId);
  const existing = await findStory(id, name);
  if (!existing) return false;

  await prisma.story.delete({
    where: { id: existing.id },
  });
  return true;
}

/**
 * Delete all stories for a specific user.
 * @param {number|string|bigint} userId
 * @returns {Promise<void>}
 */
export async function deleteAllStories(userId) {
  await prisma.story.deleteMany({
    where: { userId: BigInt(userId) },
  });
}
