import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const nome = process.env.ADMIN_NOME ?? "Administrador";
  const email = process.env.ADMIN_EMAIL ?? "admin@exemplo.com";
  const senha = process.env.ADMIN_SENHA ?? "123"; // troque/hasheie conforme necessário

  try {
    const adm = await prisma.administrador.upsert({
      where: { email },
      update: { nome, senha },
      create: { nome, email, senha },
    });

    console.log("Administrador criado/atualizado:", {
      id: adm.idAdm,
      email: adm.email,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : String(err);
    console.error("Erro ao criar/atualizar administrador:", message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

// DATABASE_URL="file:./dev.db"
// opcional: personalizar o admin criado pelo seed
// ADMIN_EMAIL="admin@exemplo.com"
// ADMIN_NOME="Administrador"
// ADMIN_SENHA="123"
