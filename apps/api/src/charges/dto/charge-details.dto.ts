import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EventDto {
  @ApiProperty({ example: "cmlmxx..." })
  id!: string;

  @ApiProperty({ example: "CHARGE_CREATED" })
  type!: string;

  @ApiPropertyOptional({
    example: { amount: 12990, currency: "BRL" },
    description: "Payload livre (JSON) para auditoria.",
  })
  payload?: any;

  @ApiProperty({ example: "2026-02-18T12:00:00.000Z" })
  createdAt!: string;
}

export class WebhookDeliveryDto {
  @ApiProperty({ example: "cmlmwbqag0005d8mac5ezcfm5" })
  id!: string;

  @ApiProperty({ example: "http://localhost:4000/webhook" })
  url!: string;

  @ApiProperty({ example: "FAILED", enum: ["PENDING", "SENT", "FAILED"] })
  status!: string;

  @ApiProperty({ example: 2 })
  attempts!: number;

  @ApiPropertyOptional({ example: "ECONNREFUSED 127.0.0.1:4000" })
  lastError?: string | null;

  @ApiPropertyOptional({ example: "2026-02-18T12:05:00.000Z" })
  nextRetryAt?: string | null;

  @ApiProperty({ example: "2026-02-18T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-02-18T12:01:00.000Z" })
  updatedAt!: string;
}

export class ChargeDetailsDto {
  @ApiProperty({ example: "cmlmwbq980000va19bes2f6ow" })
  id!: string;

  @ApiProperty({ example: "mrc_test_001" })
  merchantId!: string;

  @ApiProperty({ example: 12990 })
  amount!: number;

  @ApiProperty({ example: "BRL" })
  currency!: string;

  @ApiProperty({ example: "PAID", enum: ["PENDING", "PROCESSING", "PAID", "FAILED"] })
  status!: string;

  @ApiProperty({ example: "João Silva" })
  customerName!: string;

  @ApiProperty({ example: "joao@email.com" })
  customerEmail!: string;

  @ApiProperty({ example: "card" })
  paymentMethodType!: string;

  @ApiProperty({
    example: "1234",
    description: "Últimos 4 dígitos do token (não armazena token completo).",
  })
  paymentTokenLast4!: string;

  @ApiProperty({ example: "http://localhost:4000/webhook" })
  webhookUrl!: string;

  @ApiPropertyOptional({ example: { orderId: "123" } })
  metadata?: any;

  @ApiProperty({ example: "2026-02-18T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-02-18T12:02:00.000Z" })
  updatedAt!: string;

  @ApiProperty({ type: [EventDto] })
  events!: EventDto[];

  @ApiProperty({ type: [WebhookDeliveryDto] })
  webhookDeliveries!: WebhookDeliveryDto[];
}
