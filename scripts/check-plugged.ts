import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const atividade = await prisma.atividade.findFirst({
    where: {
      tipo: "PLUGGED",
      isStatic: true,
      source: "builtin",
    },
  });

  console.log("Atividade PLUGGED fixa encontrada:");
  console.log(JSON.stringify(atividade, null, 2));

  await prisma.$disconnect();
}

check().catch(console.error);
