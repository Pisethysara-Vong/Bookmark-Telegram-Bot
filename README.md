# 📚 Bookmark Telegram Bot

A smart, natural-language Telegram bot for tracking your reading progress across manga, manhwa, light novels, books, and webtoons. Instead of memorizing rigid syntax or slash commands, you can chat with the bot naturally to manage your reading bookmarks.

---

## 🚀 Features

- **🗣️ Natural Language Processing:** Talk to the bot naturally (e.g., *"Add Haikyuu 200"*, *"I'm on chapter 55 of Solo Leveling"*, *"What am I reading?"*).
- **🛡️ Secure Parser Architecture:** The LLM acts solely as a parser to extract structured intent; it never has direct database access or execution rights.
- **✅ Strict Type Validation:** Every parsed command is validated via [Zod](https://zod.dev/) schemas before execution.
- **⚠️ Destructive Action Confirmation:** Safeguards against accidental data loss with stateful confirmations stored in Redis with TTLs (e.g., confirming `DELETE_ALL` requires replying `YES`).
- **⚡ Instant Acknowledgement & Serverless-Ready:** Sends immediate feedback (`⏳ Processing...`) while handling parsing and database operations asynchronously with `@vercel/functions` `waitUntil`.
- **🗄️ Relational Persistence:** Backed by PostgreSQL (Supabase) and managed using [Prisma ORM](https://www.prisma.io/).

---

## 🏗️ Architecture & Flow

The bot follows a decoupled, secure pipeline where AI handles intent parsing while standard application logic handles state and persistence.

```
                  +-------------------------+
                  |      Telegram User      |
                  +-------------------------+
                               |
                               | (Message / Natural Language)
                               v
                  +-------------------------+
                  |  Express Webhook Route  |
                  |  (/telegram/webhook)    |
                  +-------------------------+
                               |
            +------------------+------------------+
            |                                     |
            v                                     v
  [Check Pending Actions]               [Send "⏳ Processing..."]
   (Upstash Redis Cache)                          |
            |                                     v
            |                         +-----------------------+
            | (No pending action)     |  LiteRouter API (LLM) |
            +------------------------>|  (llama-3.1-8b, etc.) |
                                      +-----------------------+
                                                  |
                                                  v
                                      +-----------------------+
                                      |     Zod Validation    |
                                      |   (Command Schema)    |
                                      +-----------------------+
                                                  |
                                                  v
                                      +-----------------------+
                                      |    Command Handlers   |
                                      +-----------------------+
                                                  |
                                                  v
                                      +-----------------------+
                                      |  PostgreSQL / Prisma  |
                                      |    (Story Database)   |
                                      +-----------------------+
                                                  |
                                                  v
                                      +-----------------------+
                                      | Telegram Send Message |
                                      +-----------------------+
```

### Safety by Design
1. **LLM as Parser Only:** The LLM never executes database queries directly. It outputs strict JSON containing a recognized command name and parameters.
2. **Schema Enforcement:** Zod rejects any malformed output or unexpected parameters.
3. **Deterministic Handlers:** Only predefined JavaScript functions execute database transactions.

---

## 💬 Supported Commands & Examples

You can interact with the bot using free-form natural language. The parser maps your input to one of the following operations:

| Command | Parameters | Description | Natural Language Examples |
| :--- | :--- | :--- | :--- |
| **`ADD`** | `name` *(string)*, `chapter` *(int)* | Adds a new story bookmark. Rejects duplicates. | • `"Add Haikyuu 200"`<br>• `"Save One Piece at chapter 1110"`<br>• `"Started reading Solo Leveling chapter 1"` |
| **`UPDATE`** | `name` *(string)*, `chapter` *(int)* | Updates the chapter number of an existing story. | • `"Update Haikyuu 201"`<br>• `"I'm now on chapter 15 of Tower of God"`<br>• `"Set Berserk to chapter 375"` |
| **`LIST_ALL`** | *None* | Lists all saved stories and their current chapters. | • `"Show me all"`<br>• `"List my bookmarks"`<br>• `"What am I reading?"` |
| **`LIST_SPECIFIC`** | `name` *(string)* | Checks current progress for a single story. | • `"Show me Haikyuu"`<br>• `"What chapter of Jujutsu Kaisen am I on?"`<br>• `"Find One Piece"` |
| **`DELETE_SPECIFIC`** | `name` *(string)* | Removes a specific story from your list. | • `"Delete Haikyuu"`<br>• `"Remove Bleach from my bookmarks"`<br>• `"Drop Naruto"` |
| **`DELETE_ALL`** | *None* | Clears all stories *(Requires confirmation)*. | • `"Remove everything"`<br>• `"Delete all my bookmarks"`<br>• `"Clear entire reading list"` |

### ⚠️ Confirmation Flow (`DELETE_ALL`)
When a `DELETE_ALL` intent is detected:
1. The bot saves a pending confirmation in Redis (with a 5-minute expiration).
2. The bot responds: `⚠️ Are you sure you want to delete ALL stories? Reply "YES" to confirm.`
3. If you reply **`YES`**, all records are deleted. Any other reply cancels the deletion.

---

## 🛠️ Tech Stack

- **Runtime:** [Node.js](https://nodejs.org/) (ES Modules)
- **Web Framework:** [Express.js](https://expressjs.com/)
- **Database & ORM:** [PostgreSQL](https://www.postgresql.org/) (Supabase) with [Prisma](https://www.prisma.io/)
- **Cache / Confirmation State:** [Upstash Redis](https://upstash.com/) (REST client)
- **AI / LLM API:** [LiteRouter](https://literouter.com/) (OpenAI-compatible completions endpoint)
- **Schema Validation:** [Zod](https://zod.dev/)
- **Bot Platform:** [Telegram Bot API](https://core.telegram.org/bots/api)

---

## 📁 Project Structure

```text
├── prisma/
│   └── schema.prisma              # Prisma schema definition
├── src/
│   ├── commands/                  # Isolated command handlers
│   │   ├── add.js                 # Handler for ADD
│   │   ├── update.js              # Handler for UPDATE
│   │   ├── list-all.js            # Handler for LIST_ALL
│   │   ├── list-specific.js       # Handler for LIST_SPECIFIC
│   │   ├── delete-all.js          # Handler for DELETE_ALL
│   │   └── delete-specific.js     # Handler for DELETE_SPECIFIC
│   ├── database/
│   │   ├── postgresql/
│   │   │   ├── prisma.js          # Prisma client instance
│   │   │   └── db.js              # Database helper functions
│   │   └── redis/
│   │       └── redis.js           # Upstash Redis client instance
│   ├── parser/
│   │   └── command-parser.js      # LiteRouter API call & Zod validation
│   ├── telegram/
│   │   ├── telegram.service.js    # Telegram API client (sendMessage)
│   │   └── webhook.js             # Webhook route handler & dispatcher
│   └── server.js                  # Express server entry point
├── .env.example                   # Sample environment configuration
├── package.json                   # Dependencies and scripts
└── test-parser.js                 # Parser test script
```

---

## ⚙️ Setup Guide & Instructions

### 1. Prerequisites

Ensure you have the following ready before setting up:
- **Node.js:** v18.0.0 or higher
- **Telegram Bot Token:** Obtained from [@BotFather](https://t.me/botfather)
- **LiteRouter API Key:** From [LiteRouter](https://literouter.com/)
- **PostgreSQL Database:** Free instance on [Supabase](https://supabase.com/) (or any PostgreSQL host)
- **Upstash Redis Database:** Free Redis database from [Upstash](https://upstash.com/)

---

### 2. Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Pisethysara-Vong/Bookmark-Telegram-Bot.git
   cd Bookmark-Telegram-Bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

---

### 3. Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Fill in the required environment variables:

```env
# Telegram Bot Token (from @BotFather)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ

# LiteRouter API
LITEROUTER_API_KEY=your_literouter_api_key
LITEROUTER_MODEL=llama-3.1-8b-instruct:free

# Supabase / PostgreSQL Connection String
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Upstash Redis REST Credentials
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# Server Port
PORT=3000
```

---

### 4. Database Setup (Prisma)

Push the database schema to your PostgreSQL database:

```bash
# Push schema directly to database
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

---

### 5. Running the Bot Locally

1. **Start the Express server:**
   ```bash
   # Production mode
   npm start

   # Development mode (with auto-restart)
   npm run dev
   ```

2. **Verify server health:**
   Open `http://localhost:3000/` in your browser or run:
   ```bash
   curl http://localhost:3000/
   ```
   You should receive:
   ```json
   {"status":"ok","bot":"Telegram Story Bookmark Bot"}
   ```

---

### 6. Setting Up Telegram Webhook

Telegram requires a publicly accessible **HTTPS** URL to send webhook updates.

#### For Local Development (using ngrok or localtunnel):
1. Expose port 3000:
   ```bash
   npx ngrok http 3000
   ```
2. Copy the generated HTTPS forwarding URL (e.g., `https://your-domain.ngrok-free.app`).
3. Register the webhook with Telegram:
   ```bash
   curl -F "url=https://your-domain.ngrok-free.app/telegram/webhook" \
     https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook
   ```
4. Verify webhook status:
   ```bash
   curl https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/getWebhookInfo
   ```

---

## 🧪 Testing the Command Parser

You can test how LiteRouter parses sample natural-language inputs without running Telegram:

```bash
node test-parser.js
```

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
