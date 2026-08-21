# Telegram Story Bookmark Bot — Implementation Plan

## 1. Goal

Build a Telegram bot that manages a simple story bookmark database.

Users can write natural-language messages such as:

```text
Add Haikyuu 200
Show me all
Show me Haikyuu
Delete Haikyuu
Update Haikyuu 201
Remove everything
```

The LLM only parses the message into a known command and its parameters. The application validates and executes the command.

## 2. Commands

| Command | Parameters | Example |
|---|---|---|
| `ADD` | `name`, `chapter` | `Add Haikyuu 200` |
| `UPDATE` | `name`, `chapter` | `Update Haikyuu 201` |
| `LIST_ALL` | none | `Show me all` |
| `LIST_SPECIFIC` | `name` | `Show me Haikyuu` |
| `DELETE_ALL` | none | `Remove everything` |
| `DELETE_SPECIFIC` | `name` | `Delete Haikyuu` |

`DELETE_ALL` must require confirmation before anything is deleted.

## 3. Project Structure

```text
my-project/
├── src/
│   ├── server.js
│   │
│   ├── telegram/
│   │   ├── webhook.js
│   │   └── telegram.service.js
│   │
│   ├── parser/
│   │   └── command-parser.js
│   │
│   ├── commands/
│   │   ├── add.js
│   │   ├── update.js
│   │   ├── list-all.js
│   │   ├── list-specific.js
│   │   ├── delete-all.js
│   │   └── delete-specific.js
│   │
│   └── database/
│       └── stories.json
│
├── .env
└── package.json
```

## 4. Database

`stories.json`:

```json
[
  {
    "name": "Haikyuu",
    "chapter": 200
  },
  {
    "name": "One Piece",
    "chapter": 1150
  }
]
```

The database layer should handle reading and writing this file. Command handlers should use the database layer rather than manipulating the JSON file directly.

## 5. Telegram Flow

Telegram sends updates to the Express webhook:

```text
Telegram
   │
   │ POST /telegram/webhook
   ▼
Express
   │
   ▼
Extract message
   │
   ▼
LLM Parser
   │
   ▼
Zod Validation
   │
   ▼
Command Handler
   │
   ▼
stories.json
   │
   ▼
Telegram response
```

`webhook.js` receives the Telegram update and passes the message to the parser/command system.

`telegram.service.js` is responsible for sending messages back to Telegram.

## 6. LLM Parser

Use LiteRouter's OpenAI-compatible API:

```text
Base URL:
https://api.literouter.com/v1
```

Authorization:

```text
Authorization: Bearer <LITEROUTER_API_KEY>
```

Models to support/configure:

```text
llama-3-8b-instruct:free
llama-3.1-8b-instruct:free
ministral-3b-2512:free
gpt-oss-20b:free
```

Keep the selected model in `.env`, for example:

```env
LITEROUTER_API_KEY=your_key
LITEROUTER_MODEL=llama-3.1-8b-instruct:free
```

The parser should call the OpenAI-compatible `/chat/completions` endpoint.

## 7. Parser Prompt

The LLM should be given a strict system prompt similar to:

```text
You are a command parser for a Telegram story bookmark bot.

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
```

For an unknown message:

```json
{
  "command": "UNKNOWN",
  "parameters": {}
}
```

## 8. Zod Validation

Do not execute the LLM response directly. Validate it first.

The schema should cover all commands:

```js
import { z } from "zod";

const commandSchema = z.discriminatedUnion("command", [
  z.object({
    command: z.literal("ADD"),
    parameters: z.object({
      name: z.string().min(1),
      chapter: z.number().int()
    })
  }),

  z.object({
    command: z.literal("UPDATE"),
    parameters: z.object({
      name: z.string().min(1),
      chapter: z.number().int()
    })
  }),

  z.object({
    command: z.literal("LIST_ALL"),
    parameters: z.object({})
  }),

  z.object({
    command: z.literal("LIST_SPECIFIC"),
    parameters: z.object({
      name: z.string().min(1)
    })
  }),

  z.object({
    command: z.literal("DELETE_ALL"),
    parameters: z.object({})
  }),

  z.object({
    command: z.literal("DELETE_SPECIFIC"),
    parameters: z.object({
      name: z.string().min(1)
    })
  })
]);
```

`UNKNOWN` can be handled separately before the discriminated union, or included as another command variant.

If validation fails, do not execute anything. Return an appropriate Telegram error message such as:

```text
I couldn't understand that command or some required information is missing.
```

## 9. DELETE_ALL Confirmation

`DELETE_ALL` should not immediately modify the database.

Flow:

```text
User:
"Remove everything"

        ↓

Parser:
DELETE_ALL

        ↓

Bot:
"Are you sure you want to delete all stories?
Reply YES to confirm."

        ↓

User:
"YES"

        ↓

Delete everything
```

The pending confirmation should be associated with the Telegram `chat_id`.

For a simple bot, this can initially be kept in memory:

```js
const pendingConfirmations = new Map();
```

Example:

```text
chatId → "DELETE_ALL"
```

If the user replies `YES`, execute `DELETE_ALL` and remove the pending confirmation.

Any other response can cancel the confirmation.

## 10. Error Handling

The bot should handle at least these cases:

### Unknown command

```text
I don't understand that command.
```

### Missing parameters

Example:

```text
Add Haikyuu
```

Response:

```text
Please provide both the story name and chapter number.
Example: Add Haikyuu 200
```

### Story not found

```text
I couldn't find a story named "Haikyuu".
```

### Duplicate ADD

Decide whether `ADD` should reject duplicates or overwrite them. Prefer rejecting duplicates and telling the user to use `UPDATE`.

### LLM/API failure

```text
Sorry, I couldn't process your request right now. Please try again.
```

## 11. Important Security/Architecture Rule

The LLM is **only a parser**.

It must never have direct access to:

- the database
- arbitrary JavaScript execution
- Telegram credentials
- application secrets

The application controls execution:

```text
Natural language
      ↓
LLM
      ↓
Structured command
      ↓
Zod validation
      ↓
Known command handler
      ↓
Database
```

This keeps the LLM constrained to the six commands defined by the application.

## 12. Initial Implementation Order

Implement in this order:

1. Create Express server.
2. Create `stories.json` and database functions.
3. Implement the six command handlers.
4. Implement Telegram service.
5. Implement `/telegram/webhook`.
6. Connect LiteRouter through `command-parser.js`.
7. Add Zod validation.
8. Add `DELETE_ALL` confirmation state.
9. Test natural-language variations for every command.
10. Deploy the Express server and register its public HTTPS webhook URL with Telegram.
