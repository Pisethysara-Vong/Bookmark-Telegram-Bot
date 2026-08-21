const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Send a text message to a Telegram chat.
 * @param {number|string} chatId
 * @param {string} text
 */
export async function sendMessage(chatId, text) {
  const url = `${TELEGRAM_API}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Telegram sendMessage failed: ${response.status}`, body);
  }
}
