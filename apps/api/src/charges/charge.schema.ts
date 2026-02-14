import { z } from "zod";

export const createChargeSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.literal("BRL"),
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }),
  payment_method: z.object({
    type: z.literal("card"),
    token: z.string().min(6),
  }),
  metadata: z.record(z.string(), z.any()).optional(),
  webhook_url: z.string().url(),
});
