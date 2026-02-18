import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  NotFoundException,
  HttpCode,
} from "@nestjs/common";
import { createChargeSchema } from "./charge.schema";
import { ChargesService } from "./charges.service";
import { IdempotencyService } from "./idempotency.service";
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CreateChargeDto } from "./dto/create-charge.dto";
import { ChargeCreatedResponseDto, RetryWebhookResponseDto } from "./dto/charge-response.dto";
import { ChargeDetailsDto } from "./dto/charge-details.dto";


@Controller("/v1/charges")
@ApiTags("Charges")
@ApiBearerAuth("bearer")
@Controller("/v1/charges")
export class ChargesController {
  constructor(
    private readonly charges: ChargesService,
    private readonly idem: IdempotencyService
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Criar cobrança (idempotente)" })
  @ApiHeader({
  name: "Idempotency-Key",
  required: true,
  description:
    "Chave de idempotência. Mesma chave + mesmo payload retorna a mesma cobrança. Payload diferente retorna 409.",
  example: "idem_001",
})
  @ApiBody({ type: CreateChargeDto })
  @ApiResponse({ status: 201, type: ChargeCreatedResponseDto })
  @ApiResponse({ status: 400, description: "Payload inválido ou headers ausentes" })
  @ApiResponse({ status: 401, description: "API Key inválida" })
  @ApiResponse({ status: 409, description: "Idempotency-Key reutilizada com payload diferente" })
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
  @ApiOperation({ summary: "Consultar cobrança (inclui events e webhookDeliveries)" })
  @ApiParam({ name: "id", example: "cmlmwbq980000va19bes2f6ow" })
  @ApiResponse({ status: 200, type: ChargeDetailsDto })
  @ApiResponse({ status: 404, description: "Charge não encontrada" })
  async get(@Param("id") id: string) {
    const merchantId = "mrc_test_001";
    return this.charges.getCharge(id, merchantId);
  }

  @Post(":id/webhooks/retry")
  @ApiOperation({ summary: "Reenviar webhook manualmente" })
  @ApiParam({ name: "id", example: "cmlmwbq980000va19bes2f6ow" })
  @ApiResponse({ status: 201, type: RetryWebhookResponseDto })
  @ApiResponse({ status: 400, description: "Charge não encontrada" })
async retry(@Param("id") id: string) {
  const merchantId = "mrc_test_001";

  const result = await this.charges.retryWebhook(id, merchantId);
  if (!result) throw new NotFoundException("Charge not found");

  return result;
}


}
