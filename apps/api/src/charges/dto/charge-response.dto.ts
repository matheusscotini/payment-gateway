import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ChargeCreatedResponseDto {
  @ApiProperty({ example: "cmlmwbq980000va19bes2f6ow" })
  id!: string;

  @ApiProperty({ example: "PENDING", enum: ["PENDING", "PROCESSING", "PAID", "FAILED"] })
  status!: string;

  @ApiProperty({ example: 12990 })
  amount!: number;

  @ApiProperty({ example: "BRL" })
  currency!: string;

  @ApiProperty({ example: "2026-02-18T12:00:00.000Z" })
  created_at!: string;
}

export class RetryWebhookResponseDto {
  @ApiProperty({ example: "cmlmwbqag0005d8mac5ezcfm5" })
  deliveryId!: string;

  @ApiProperty({ example: "ENQUEUED" })
  status!: string;
}
