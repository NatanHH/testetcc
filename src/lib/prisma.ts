import { PrismaClient } from "@prisma/client";

declare global {
  // evita múltiplas instâncias em dev
  // var prisma: PrismaClient | undefined; <- declaração via global abaixo
}

const client =
  (global as unknown as { prisma?: PrismaClient }).prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  (global as unknown as { prisma?: PrismaClient }).prisma = client;
}

export default client;
