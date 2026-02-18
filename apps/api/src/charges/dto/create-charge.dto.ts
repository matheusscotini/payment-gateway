import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class CustomerDto {
  @ApiProperty({ example: "João Silva" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "joao@email.com" })
  @IsEmail()
  email!: string;
}

class PaymentMethodDto {
  @ApiProperty({ example: "card", enum: ["card"] })
  @IsIn(["card"])
  type!: "card";

  @ApiProperty({
    example: "tok_test_visa_1234",
    description: "Token simulado. Se terminar com 0000, falha.",
  })
  @IsString()
  @MinLength(6)
  token!: string;
}

export class CreateChargeDto {
  @ApiProperty({ example: 12990, description: "Valor em centavos (inteiro)" })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: "BRL", enum: ["BRL"] })
  @IsIn(["BRL"])
  currency!: "BRL";

  @ApiProperty({ type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @ApiProperty({ name: "payment_method", type: PaymentMethodDto })
  @ValidateNested()
  @Type(() => PaymentMethodDto)
  payment_method!: PaymentMethodDto;

  @ApiPropertyOptional({
    example: { orderId: "123" },
    description: "Metadados livres (JSON).",
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ example: "http://localhost:4000/webhook" })
  @IsUrl()
  webhook_url!: string;
}
