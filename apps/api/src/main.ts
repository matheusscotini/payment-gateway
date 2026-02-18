import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  const config = new DocumentBuilder()
    .setTitle("Payment Gateway")
    .setDescription(
      [
        "Simulador de gateway com idempotência, processamento assíncrono e webhooks com retry/backoff.",
        "",
        "Regras:",
        "- Token terminando em 0000 → FAILED",
        "- Caso contrário → PAID",
        "- Webhook é at-least-once e independente do status do pagamento",
      ].join("\n")
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "API Key" },
      "bearer"
    )
    .addTag("Charges", "Criação e consulta de cobranças")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}
bootstrap();
