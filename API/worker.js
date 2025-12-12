import amqplib from "amqplib";
import { pool } from "./db.js";
import fetch from "node-fetch"; // 👈 integração HTTP com o n8n

const RABBIT_URL = "amqp://user:pass@localhost:5672";
const QUEUE = "messages.to_process";

// "IA" simples: regra de prioridade
function classify(text) {
  const lower = text.toLowerCase();
  let priority = "normal";

  if (lower.includes("reclamação") || lower.includes("problema")) {
    priority = "alta";
  }
  if (lower.includes("obrigado") || lower.includes("valeu")) {
    priority = "baixa";
  }

  return { priority };
}

async function startWorker() {
  const conn = await amqplib.connect(RABBIT_URL);
  const channel = await conn.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });
  channel.prefetch(5);

  console.log("Worker listening on queue:", QUEUE);

  channel.consume(
    QUEUE,
    async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        console.log("Processing message:", payload);

        const { priority } = classify(payload.text);

        // Atualiza no Postgres
        await pool.query(
          `UPDATE messages
           SET status = $1, priority = $2
           WHERE id = $3`,
          ["PROCESSED", priority, payload.id]
        );

        // 🔔 Notifica o n8n pelo webhook /webhook/smartqueue
        try {
          await fetch("http://localhost:5678/webhook/smartqueue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageId: payload.id,
              priority,
              text: payload.text,
            }),
          });
          console.log("Notified n8n with priority:", priority);
        } catch (err) {
          console.error("Erro ao notificar n8n", err);
        }

        channel.ack(msg);
      } catch (err) {
        console.error("Error processing msg", err);
        channel.nack(msg, false, false); // simples: descarta a mensagem em caso de erro
      }
    },
    { noAck: false }
  );
}

startWorker().catch((err) => {
  console.error("Worker error", err);
  process.exit(1);
});
