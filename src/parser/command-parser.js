import { z } from "zod";

const LITEROUTER_BASE_URL = "https://api.literouter.com/v1";

const SYSTEM_PROMPT = `You are a command parser for a Telegram story bookmark bot.

Your ONLY job is to convert the user's message into exactly one
of the available commands.

Available commands:

ADD
- Description: Add a story bookmark.
- Parameters: name (string), chapter (integer)

UPDATE
- Description: Update an existing story bookmark.
- Parameters: name (string), chapter (integer)

LIST_ALL
- Description: List every saved story.
- Parameters: none

LIST_SPECIFIC
- Description: Show one specific story.
- Parameters: name (string)

DELETE_ALL
- Description: Delete every saved story.
- Parameters: none

DELETE_SPECIFIC
- Description: Delete one specific story.
- Parameters: name (string)

Rules:
1. Only return commands from the list above.
2. Never invent a command.
3. Never execute a command.
4. Extract parameters from the user's message.
5. Chapter must be an integer.
6. If a required parameter is missing, return it as null.
7. If the message does not clearly match a command, return UNKNOWN.
8. Return ONLY valid JSON.

Output format:

{
  "command": "ADD",
  "parameters": {
    "name": "Haikyuu",
    "chapter": 200
  }
}

For an unknown message:

{
  "command": "UNKNOWN",
  "parameters": {}
}`;

// --- Zod schemas ---

const addSchema = z.object({
  command: z.literal("ADD"),
  parameters: z.object({
    name: z.string().min(1),
    chapter: z.number().int(),
  }),
});

const updateSchema = z.object({
  command: z.literal("UPDATE"),
  parameters: z.object({
    name: z.string().min(1),
    chapter: z.number().int(),
  }),
});

const listAllSchema = z.object({
  command: z.literal("LIST_ALL"),
  parameters: z.object({}),
});

const listSpecificSchema = z.object({
  command: z.literal("LIST_SPECIFIC"),
  parameters: z.object({
    name: z.string().min(1),
  }),
});

const deleteAllSchema = z.object({
  command: z.literal("DELETE_ALL"),
  parameters: z.object({}),
});

const deleteSpecificSchema = z.object({
  command: z.literal("DELETE_SPECIFIC"),
  parameters: z.object({
    name: z.string().min(1),
  }),
});

const unknownSchema = z.object({
  command: z.literal("UNKNOWN"),
  parameters: z.object({}),
});

const commandSchema = z.discriminatedUnion("command", [
  addSchema,
  updateSchema,
  listAllSchema,
  listSpecificSchema,
  deleteAllSchema,
  deleteSpecificSchema,
  unknownSchema,
]);

/**
 * Call the LiteRouter chat completions API and parse the response
 * into a validated command object.
 *
 * @param {string} userMessage - The raw message from the user
 * @returns {Promise<{command: string, parameters: object}>}
 * @throws {Error} On API or validation failure
 */
export async function parseCommand(userMessage) {
  const response = await fetch(`${LITEROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LITEROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LITEROUTER_MODEL || "llama-3.1-8b-instruct:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`LiteRouter API error: ${response.status}`, body);
    throw new Error("LLM API request failed");
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error("No content in LLM response");
  }

  // Extract JSON from the response (the LLM might wrap it in markdown code fences)
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not extract JSON from LLM response: ${rawContent}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Invalid JSON from LLM: ${jsonMatch[0]}`);
  }

  // Validate with Zod
  const result = commandSchema.safeParse(parsed);

  if (!result.success) {
    console.error("Zod validation failed:", result.error.format());
    throw new Error("Command validation failed");
  }

  return result.data;
}
