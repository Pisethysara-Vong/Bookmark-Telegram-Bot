import { z } from "zod";

export const addSchema = z.object({
  command: z.literal("ADD"),
  parameters: z.object({
    name: z.string().min(1),
    chapter: z.number().int(),
  }),
});

export const updateSchema = z.object({
  command: z.literal("UPDATE"),
  parameters: z.object({
    name: z.string().min(1),
    chapter: z.number().int(),
  }),
});

export const listAllSchema = z.object({
  command: z.literal("LIST_ALL"),
  parameters: z.object({}),
});

export const listSpecificSchema = z.object({
  command: z.literal("LIST_SPECIFIC"),
  parameters: z.object({
    name: z.string().min(1),
  }),
});

export const deleteAllSchema = z.object({
  command: z.literal("DELETE_ALL"),
  parameters: z.object({}),
});

export const deleteSpecificSchema = z.object({
  command: z.literal("DELETE_SPECIFIC"),
  parameters: z.object({
    name: z.string().min(1),
  }),
});

export const unknownSchema = z.object({
  command: z.literal("UNKNOWN"),
  parameters: z.object({}),
});

export const commandSchema = z.discriminatedUnion("command", [
  addSchema,
  updateSchema,
  listAllSchema,
  listSpecificSchema,
  deleteAllSchema,
  deleteSpecificSchema,
  unknownSchema,
]);
