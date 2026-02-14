import request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../app.module";

describe("Charges - Idempotency", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const headersBase = {
    Authorization: "Bearer mk_test_123",
    "Content-Type": "application/json",
  };

  it("returns same charge for same Idempotency-Key and same payload", async () => {
    const payload = {
      amount: 12990,
      currency: "BRL",
      customer: { name: "Joao", email: "joao@email.com" },
      payment_method: { type: "card", token: "tok_test_visa_1234" },
      metadata: { orderId: "123" },
      webhook_url: "http://localhost:4000/webhook",
    };

    const r1 = await request(app.getHttpServer())
      .post("/v1/charges")
      .set({ ...headersBase, "Idempotency-Key": "test_idem_001" })
      .send(payload)
      .expect(201);

    const r2 = await request(app.getHttpServer())
      .post("/v1/charges")
      .set({ ...headersBase, "Idempotency-Key": "test_idem_001" })
      .send(payload)
      .expect(201);

    expect(r1.body.id).toBe(r2.body.id);
    expect(r1.body.status).toBeDefined();
  });

  it("returns 409 when Idempotency-Key reused with different payload", async () => {
    const payload1 = {
      amount: 1000,
      currency: "BRL",
      customer: { name: "Joao", email: "joao@email.com" },
      payment_method: { type: "card", token: "tok_test_visa_1111" },
      webhook_url: "http://localhost:4000/webhook",
    };

    const payload2 = {
      ...payload1,
      amount: 2000, // muda payload
    };

    await request(app.getHttpServer())
      .post("/v1/charges")
      .set({ ...headersBase, "Idempotency-Key": "test_idem_002" })
      .send(payload1)
      .expect(201);

    await request(app.getHttpServer())
      .post("/v1/charges")
      .set({ ...headersBase, "Idempotency-Key": "test_idem_002" })
      .send(payload2)
      .expect(409);
  });
});
