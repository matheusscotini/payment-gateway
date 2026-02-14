import "dotenv/config";
import { Worker, Queue } from "bullmq";
import fetch from "node-fetch";
import crypto from "crypto";
import { prisma } from "./prisma";

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return { host: u.hostname, port: Number(u.port || 6379), password: u.password || undefined };
}

function simulatePayment(last4: string) {
  return !last4.endsWith("0000");
}

function sign(body: string) {
  return crypto
    .createHmac("sha256", process.env.WEBHOOK_SIGNING_SECRET!)
    .update(body)
    .digest("hex");
}

const connection = parseRedisUrl(process.env.REDIS_URL!);
const webhookQueue = new Queue("webhook", { connection });

async function enqueueWebhookDelivery(deliveryId: string) {
  await webhookQueue.add(
    "deliver",
    { deliveryId },
    {
      attempts: 4,
      backoff: { type: "exponential", delay: 60_000 }, // 60s, 120s, 240s...
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
}

/**
 * WORKER 1: processa charge e agenda webhook delivery
 */
new Worker(
  "charge",
  async (job) => {
    const { chargeId } = job.data as { chargeId: string };

    const charge = await prisma.charge.findUnique({ where: { id: chargeId } });
    if (!charge) return;

    await prisma.charge.update({ where: { id: chargeId }, data: { status: "PROCESSING" } });
    await prisma.event.create({ data: { chargeId, type: "CHARGE_PROCESSING", payload: {} } });

    const approved = simulatePayment(charge.paymentTokenLast4);
    const newStatus = approved ? "PAID" : "FAILED";

    await prisma.charge.update({ where: { id: chargeId }, data: { status: newStatus } });
    await prisma.event.create({
      data: { chargeId, type: approved ? "CHARGE_PAID" : "CHARGE_FAILED", payload: {} },
    });

    const delivery = await prisma.webhookDelivery.create({
      data: { chargeId, url: charge.webhookUrl, status: "PENDING", attempts: 0 },
    });

    await prisma.event.create({
      data: { chargeId, type: "WEBHOOK_ENQUEUED", payload: { deliveryId: delivery.id, url: charge.webhookUrl } },
    });

    await enqueueWebhookDelivery(delivery.id);
  },
  { connection }
);

/**
 * WORKER 2: entrega webhook com retry/backoff
 */
const webhookWorker = new Worker(
  "webhook",
  async (job) => {
    const { deliveryId } = job.data as { deliveryId: string };

    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { charge: true },
    });
    if (!delivery?.charge) return;

    const charge = delivery.charge;

    const body = JSON.stringify({
      type: charge.status === "PAID" ? "charge.paid" : "charge.failed",
      charge_id: charge.id,
      status: charge.status,
      amount: charge.amount,
      currency: charge.currency,
      created_at: new Date().toISOString(),
    });

    const res = await fetch(delivery.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Signature": sign(body) },
      body,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", attempts: { increment: 1 }, lastError: null, nextRetryAt: null },
    });

    await prisma.event.create({
      data: { chargeId: charge.id, type: "WEBHOOK_SENT", payload: { url: delivery.url } },
    });
  },
  { connection }
);

// quando falhar, registra no banco (mantém histórico e visibilidade)
webhookWorker.on("failed", async (job, err) => {
  try {
    const { deliveryId } = (job?.data ?? {}) as { deliveryId?: string };
    if (!deliveryId) return;

    // aproximação: próximo retry em 60s * 2^(attemptsMade)
    const attemptsMade = job?.attemptsMade ?? 0;
    const delay = 60_000 * Math.pow(2, attemptsMade);
    const nextRetryAt = new Date(Date.now() + delay);

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        attempts: attemptsMade + 1,
        lastError: String(err?.message ?? err),
        nextRetryAt,
      },
    });

    // opcional: evento de falha
    const delivery = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId } });
    if (delivery) {
      await prisma.event.create({
        data: {
          chargeId: delivery.chargeId,
          type: "WEBHOOK_FAILED",
          payload: { error: String(err?.message ?? err) },
        },
      });
    }
  } catch {
    // evita crash em handler de evento
  }
});

console.log("Workers up: charge + webhook");
