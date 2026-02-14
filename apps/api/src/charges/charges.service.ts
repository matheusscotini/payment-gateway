import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { chargeQueue } from "../queue";
import { webhookQueue } from "../queue";

const prisma = new PrismaClient();

@Injectable()
export class ChargesService {
  async createCharge(args: { merchantId: string; body: any }) {
    const token = String(args.body.payment_method.token);
    const last4 = token.slice(-4).padStart(4, "0");

    const charge = await prisma.charge.create({
      data: {
        merchantId: args.merchantId,
        amount: args.body.amount,
        currency: args.body.currency,
        status: "PENDING",
        customerName: args.body.customer.name,
        customerEmail: args.body.customer.email,
        paymentMethodType: args.body.payment_method.type,
        paymentTokenLast4: last4,
        webhookUrl: args.body.webhook_url,
        metadata: args.body.metadata ?? {},
      },
    });

    await prisma.event.create({
      data: {
        chargeId: charge.id,
        type: "CHARGE_CREATED",
        payload: { amount: charge.amount, currency: charge.currency },
      },
    });

    await chargeQueue.add("process", { chargeId: charge.id });

    return charge;
  }

  async getCharge(id: string, merchantId: string) {
    return prisma.charge.findFirst({
      where: { id, merchantId },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        webhookDeliveries: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async retryWebhook(chargeId: string, merchantId: string) {
  const charge = await prisma.charge.findFirst({
    where: { id: chargeId, merchantId },
    include: { webhookDeliveries: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!charge) return null;

  const delivery = await prisma.webhookDelivery.create({
    data: {
      chargeId: charge.id,
      url: charge.webhookUrl,
      status: "PENDING",
      attempts: 0,
      lastError: null,
      nextRetryAt: null,
    },
  });

  await prisma.event.create({
    data: {
      chargeId: charge.id,
      type: "WEBHOOK_ENQUEUED",
      payload: { deliveryId: delivery.id, manual: true, url: charge.webhookUrl },
    },
  });

  await webhookQueue.add(
    "deliver",
    { deliveryId: delivery.id },
    {
      attempts: 4,
      backoff: { type: "exponential", delay: 60_000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  return { deliveryId: delivery.id, status: "ENQUEUED" };
}

}
