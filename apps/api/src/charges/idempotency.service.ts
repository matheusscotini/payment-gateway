import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

@Injectable()
export class IdempotencyService {
  async getOrCreate(params: {
    merchantId: string;
    key: string;
    requestBody: any;
    createFn: () => Promise<{ chargeId: string; responseSnapshot: any }>;
  }) {
    const requestHash = sha256(JSON.stringify(params.requestBody));

    const existing = await prisma.idempotencyKey.findUnique({
      where: { merchantId_key: { merchantId: params.merchantId, key: params.key } },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException("Idempotency-Key reused with different payload");
      }
      return { chargeId: existing.chargeId, response: existing.responseSnapshot };
    }

    const created = await params.createFn();

    await prisma.idempotencyKey.create({
      data: {
        merchantId: params.merchantId,
        key: params.key,
        requestHash,
        responseSnapshot: created.responseSnapshot,
        chargeId: created.chargeId,
      },
    });

    return { chargeId: created.chargeId, response: created.responseSnapshot };
  }
}
