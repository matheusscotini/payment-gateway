import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from "@nestjs/common";
import { createChargeSchema } from "./charge.schema";
import { ChargesService } from "./charges.service";
import { IdempotencyService } from "./idempotency.service";


@Controller("/v1/charges")
export class ChargesController {
  constructor(
    private readonly charges: ChargesService,
    private readonly idem: IdempotencyService
  ) {}

  @Post()
  async create(
    @Body() body: any,
    @Headers("idempotency-key") idemKey: string | undefined,
    @Headers("authorization") authorization: string | undefined
  ) {
    if (!authorization?.startsWith("Bearer ")) {
      throw new BadRequestException("Missing Authorization: Bearer <api_key>");
    }
    const apiKey = authorization.slice("Bearer ".length);
    if (apiKey !== process.env.MERCHANT_API_KEY) {
      throw new BadRequestException("Invalid API key");
    }

    if (!idemKey) throw new BadRequestException("Idempotency-Key is required");

    const parsed = createChargeSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    const merchantId = "mrc_test_001";

    const result = await this.idem.getOrCreate({
      merchantId,
      key: idemKey,
      requestBody: parsed.data,
      createFn: async () => {
        const charge = await this.charges.createCharge({ merchantId, body: parsed.data });
        return {
          chargeId: charge.id,
          responseSnapshot: {
            id: charge.id,
            status: charge.status,
            amount: charge.amount,
            currency: charge.currency,
            created_at: charge.createdAt.toISOString(),
          },
        };
      },
    });

    return result.response;
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const merchantId = "mrc_test_001";
    return this.charges.getCharge(id, merchantId);
  }

  @Post(":id/webhooks/retry")
async retry(@Param("id") id: string) {
  const merchantId = "mrc_test_001";

  const result = await this.charges.retryWebhook(id, merchantId);
  if (!result) throw new BadRequestException("Charge not found");

  return result;
}

}
