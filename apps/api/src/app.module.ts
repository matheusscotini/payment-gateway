import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChargesController } from "./charges/charges.controller";
import { ChargesService } from "./charges/charges.service";
import { IdempotencyService } from "./charges/idempotency.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [ChargesController],
  providers: [ChargesService, IdempotencyService],
})
export class AppModule {}
