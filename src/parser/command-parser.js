import { SYSTEM_PROMPT } from "./system-prompt.js";
import { commandSchema } from "./command-schema.js";

const LITEROUTER_BASE_URL = "https://api.literouter.com/v1";

/**
 * Sends chat completion request to LiteRouter API and extracts raw message text.
 *
 * @param {string} userMessage - The raw message from the user
 * @returns {Promise<string>} The raw text response from the model
 */
async function callLlmApi(userMessage) {
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

  return rawContent;
}

/**
 * Extracts and parses JSON from the raw LLM response.
 *
 * @param {string} rawContent - The raw text from the LLM
 * @returns {object} The parsed JSON object
 */
function extractJson(rawContent) {
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Some models return just "UNKNOWN" as plain text instead of JSON
    if (rawContent.toUpperCase().includes("UNKNOWN")) {
      return { command: "UNKNOWN", parameters: {} };
    }
    throw new Error(`Could not extract JSON from LLM response: ${rawContent}`);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Invalid JSON from LLM: ${jsonMatch[0]}`);
  }
}

/**
 * Validates parsed command object using Zod schema.
 *
 * @param {object} parsed - The parsed JSON command candidate
 * @returns {{command: string, parameters: object}} Validated command object
 */
function validateCommand(parsed) {
  const result = commandSchema.safeParse(parsed);

  if (!result.success) {
    console.error("Zod validation failed:", result.error.format());
    throw new Error("Command validation failed");
  }

  return result.data;
}

/**
 * Call the LiteRouter chat completions API and parse the response
 * into a validated command object.
 *
 * @param {string} userMessage - The raw message from the user
 * @returns {Promise<{command: string, parameters: object}>}
 * @throws {Error} On API or validation failure
 */
export async function parseCommand(userMessage) {
  const rawContent = await callLlmApi(userMessage);
  const parsed = extractJson(rawContent);
  return validateCommand(parsed);
}
