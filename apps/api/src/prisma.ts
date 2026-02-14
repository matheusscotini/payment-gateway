import "dotenv/config";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Add apps/api/.env with DATABASE_URL=...");
}

export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});
