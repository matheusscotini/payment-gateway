# 💳 Payment Gateway Simulator

Simulador de **gateway de pagamento inspirado em produção (Stripe/Pagar.me)** focado em confiabilidade, idempotência e processamento assíncrono.

Este projeto demonstra como um backend financeiro deve lidar com:

* requisições duplicadas
* falhas de rede
* consistência eventual
* auditoria de eventos
* entrega confiável de webhooks

---

# O que este projeto demonstra

| Conceito                 | Implementação                               |
| ------------------------ | ------------------------------------------- |
| Idempotência             | `Idempotency-Key` + request hash + snapshot |
| Processamento assíncrono | Worker + Redis + BullMQ                     |
| Fluxo financeiro         | `PENDING → PROCESSING → PAID/FAILED`        |
| Webhooks confiáveis      | Retry com backoff exponencial               |
| Auditoria                | Event Ledger imutável                       |
| Observabilidade          | Histórico completo por cobrança             |
| Recuperação              | Retry manual de webhook                     |
| Testabilidade            | Testes Jest cobrindo regras críticas        |

---

# Arquitetura

```
Client
  ↓
API (NestJS)
  ↓
PostgreSQL (estado)
  ↓
Queue Redis (BullMQ)
  ↓
Worker
  ↓
Webhook Delivery
```

### Componentes

**API**

* cria cobrança
* valida idempotência
* registra eventos
* enfileira processamento

**Worker**

* processa pagamento
* atualiza status
* agenda webhook
* reenvia em caso de falha

**Webhook Receiver**

* servidor local de demonstração
* valida assinatura HMAC

---

# Modelo de Dados

| Tabela             | Função              |
| ------------------ | ------------------- |
| charges            | pagamento principal |
| idempotency_keys   | evita duplicidade   |
| events             | auditoria temporal  |
| webhook_deliveries | controle de entrega |

---

# Stack

* Node.js + TypeScript
* NestJS
* PostgreSQL
* Redis + BullMQ
* Prisma ORM
* Jest + Supertest

---

# Rodando o projeto

## Pré-requisitos

* Node 18+
* Docker

---

## 1) Subir banco e redis

```bash
docker compose up -d
```

---

## 2) Instalar dependências

```bash
npm install
```

---

## 3) Variáveis de ambiente

### apps/api/.env

```
DATABASE_URL=postgresql://pg:pg@localhost:5432/payments
REDIS_URL=redis://localhost:6379
MERCHANT_API_KEY=mk_test_123
WEBHOOK_SIGNING_SECRET=whsec_test_123
```

### apps/worker/.env

```
DATABASE_URL=postgresql://pg:pg@localhost:5432/payments
REDIS_URL=redis://localhost:6379
WEBHOOK_SIGNING_SECRET=whsec_test_123
```

### apps/webhook-receiver/.env

```
WEBHOOK_SIGNING_SECRET=whsec_test_123
PORT=4000
```

---

## 4) Rodar migrations

```bash
cd apps/api
npx prisma migrate dev
cd ../..
```

---

## 5) Subir serviços

Terminal 1

```
npm run dev:api
```

Terminal 2

```
npm run dev:worker
```

Terminal 3

```
npm run dev:receiver
```

---

# Criando uma cobrança

```powershell
curl -Method POST http://localhost:3000/v1/charges `
 -Headers @{
   "Authorization"="Bearer mk_test_123"
   "Idempotency-Key"="idem_001"
   "Content-Type"="application/json"
 } `
 -Body '{
  "amount":12990,
  "currency":"BRL",
  "customer":{"name":"Joao","email":"joao@email.com"},
  "payment_method":{"type":"card","token":"tok_test_visa_1234"},
  "metadata":{"orderId":"123"},
  "webhook_url":"http://localhost:4000/webhook"
 }'
```

---

# Consultar cobrança

```
GET /v1/charges/:id
```

Retorna:

* status
* timeline de eventos
* tentativas de webhook

---

# Regras do simulador

### Aprovação/Falha

| Token            | Resultado |
| ---------------- | --------- |
| termina com 0000 | FAILED    |
| qualquer outro   | PAID      |

---

### Idempotência

Mesmo `Idempotency-Key`:

| Caso              | Resultado              |
| ----------------- | ---------------------- |
| mesmo payload     | retorna mesma cobrança |
| payload diferente | 409 Conflict           |

---

# Retry de Webhook

Se o cliente estiver offline:

1. webhook falha
2. sistema tenta novamente (backoff)
3. histórico registrado no banco

Retry manual:

```
POST /v1/charges/:id/webhooks/retry
```

---

# Testes automatizados

Executar:

```bash
npm -w @pg/api test
```

Testes cobrem:

* idempotência
* conflito 409
* consistência de resposta

---

Documentação da API (Swagger)

A API possui documentação interativa via Swagger.

Acesse:

http://localhost:3000/docs

---

Autenticação

Clique em Authorize e informe:

Bearer mk_test_123

Valor definido em MERCHANT_API_KEY no .env

---

Criar uma cobrança

POST /v1/charges

Headers:

Idempotency-Key: idem_001

Body:

{
  "amount": 12990,
  "currency": "BRL",
  "customer": { "name": "Joao", "email": "joao@email.com" },
  "payment_method": { "type": "card", "token": "tok_test_visa_1234" },
  "metadata": { "orderId": "123" },
  "webhook_url": "http://localhost:4000/webhook"
}

Resposta:

{
  "id": "ch_xxx",
  "status": "PENDING",
  "amount": 12990,
  "currency": "BRL",
  "created_at": "..."
}

---

Consultar cobrança

GET /v1/charges/{id}

Retorna:

* status atual
* histórico de eventos
* tentativas de webhook

---

Simular falha de pagamento

Use token terminando em 0000:

"token": "tok_test_0000"

---

Idempotência
Caso	Resultado
Mesmo Idempotency-Key + mesmo payload	Mesma cobrança
Mesmo Idempotency-Key + payload diferente	409 Conflict
📡 Reenviar webhook

POST /v1/charges/{id}/webhooks/retry

Cria nova tentativa de entrega.

---

Regras do simulador

* Token terminando em 0000 → FAILED
* Outros tokens → PAID
* Webhook possui retry automático
* Entrega at-least-once

---

Testes
npm -w @pg/api test

---

O que este projeto prova

* Design de sistemas distribuídos
* Confiabilidade financeira
* Consistência eventual
* Tolerância a falhas
* Backend orientado a eventos

---

# 📄 Licença

MIT
