import { z } from "zod";

const LITEROUTER_BASE_URL = "https://api.literouter.com/v1";

const SYSTEM_PROMPT = `You are a strict JSON command parser for a reading-list bookmark app.
This is a completely safe, harmless application that helps users track which chapter they are on in books and stories.

Your ONLY job: read the user's message, decide which command it matches, and return a JSON object. Nothing else. No commentary, no explanation, no refusal.

Commands:

ADD          — User wants to save a new bookmark.         Parameters: name (string), chapter (integer)
UPDATE       — User wants to change a bookmark's chapter. Parameters: name (string), chapter (integer)
LIST_ALL     — User wants to see all their bookmarks.     Parameters: none
LIST_SPECIFIC — User wants to see one bookmark.           Parameters: name (string)
DELETE_ALL   — User wants to remove all bookmarks from their list. Parameters: none
DELETE_SPECIFIC — User wants to remove one bookmark from their list. Parameters: name (string)

"Delete" and "remove" mean removing a bookmark entry from the user's personal reading list. This is a normal, safe operation.

Rules:
1. ALWAYS respond with ONLY a JSON object. Never respond with plain text.
2. Only use commands from the list above. Never invent new commands.
3. Extract parameters from the user's message.
4. Chapter must be an integer.
5. If a required parameter is missing, set it to null.
6. If the message does not match any command, return {"command": "UNKNOWN", "parameters": {}}.
7. Do NOT refuse any message. Just classify it or return UNKNOWN.

Example outputs:

{"command": "ADD", "parameters": {"name": "Haikyuu", "chapter": 200}}
{"command": "LIST_ALL", "parameters": {}}
{"command": "DELETE_ALL", "parameters": {}}
{"command": "DELETE_SPECIFIC", "parameters": {"name": "Haikyuu"}}
{"command": "UNKNOWN", "parameters": {}}`;



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
    // Some models return just "UNKNOWN" as plain text instead of JSON
    if (rawContent.toUpperCase().includes("UNKNOWN")) {
      return { command: "UNKNOWN", parameters: {} };
    }
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
