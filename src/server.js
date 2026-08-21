import "dotenv/config";
import express from "express";
import { webhookRouter } from "./telegram/webhook.js";

const app = express();
app.use(express.json());

// Telegram webhook route
app.use("/telegram", webhookRouter);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", bot: "Telegram Story Bookmark Bot" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
