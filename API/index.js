import express from "express";
import cors from "cors";
import amqplib from "amqplib";
import { v4 as uuid } from "uuid";
import { pool, initDb } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const RABBIT_URL = "amqp://user:pass@localhost:5672";
const EXCHANGE = "messages.exchange";
const QUEUE = "messages.to_process";
const ROUTING_KEY = "typebot.whatsapp";

let channel;

async function initRabbit() {
  const conn = await amqplib.connect(RABBIT_URL);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, "direct", { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
}

app.get("/health", (_req, res) => res.json({ ok: true }));

// Simulação de webhook do Typebot
app.post("/webhooks/typebot", async (req, res) => {
  try {
    const { from, text, channel: chan = "whatsapp" } = req.body;

    if (!from || !text) {
      return res.status(400).json({ error: "from e text são obrigatórios" });
    }

    const id = uuid();

    await pool.query(
      `INSERT INTO messages (id, channel, from_phone, text, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, chan, from, text, "RECEIVED"]
    );

    const payload = { id, channel: chan, from, text };
    await channel.publish(
      EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );

    res.status(202).json({ id, status: "enqueued" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

// Listagem simples
app.get("/messages", async (_req, res) => {
  const result = await pool.query(
    `SELECT * FROM messages ORDER BY created_at DESC LIMIT 50`
  );
  res.json(result.rows);
});

const PORT = 3000;

async function start() {
  await initDb();
  await initRabbit();
  app.listen(PORT, () =>
    console.log(`API running on http://localhost:${PORT}`)
  );
}

start().catch((err) => {
  console.error("Failed to start API", err);
  process.exit(1);
});
