import { Queue } from "bullmq";

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return { host: u.hostname, port: Number(u.port || 6379), password: u.password || undefined };
}

export const chargeQueue = new Queue("charge", {
  connection: parseRedisUrl(process.env.REDIS_URL!),
});

export const webhookQueue = new Queue("webhook", {
  connection: parseRedisUrl(process.env.REDIS_URL!),
});
