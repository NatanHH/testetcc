import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function fixSequence() {
  try {
    const ag = await prisma.atividade.aggregate({
      _max: { idAtividade: true },
    });
    const maxId = (ag._max.idAtividade ?? 0) as number;
    const dbUrl = process.env.DATABASE_URL ?? "";

    if (dbUrl.startsWith("postgres")) {
      // ajusta sequência para Postgres (next value será maxId+1)
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('atividade','idAtividade'), ${maxId}, true);`
      );
      console.log("Postgres: sequence ajustada para", maxId);
    } else if (dbUrl.startsWith("mysql")) {
      // MYSQL: auto_increment deve ser max+1
      const next = maxId + 1;
      await prisma.$executeRawUnsafe(
        `ALTER TABLE atividade AUTO_INCREMENT = ${next};`
      );
      console.log("MySQL: AUTO_INCREMENT ajustado para", next);
    } else if (dbUrl.includes("sqlite")) {
      // SQLite: sqlite_sequence.seq = maxId
      await prisma.$executeRawUnsafe(
        `UPDATE sqlite_sequence SET seq = ${maxId} WHERE name = 'atividade';`
      );
      console.log("SQLite: sqlite_sequence atualizado para", maxId);
    } else {
      console.log("DB provider não identificado, pulei ajuste de sequência.");
    }
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
    console.error("Erro ao ajustar sequência:", message);
  }
}

async function main() {
  const titulo = "Contando os pontos (Plugged)";
  const descricao = `Jogo: Contando os pontos — cartas com valores em potências de 2 (1,2,4,8,16,...).
O aluno vira cartas para representar bits 1 e 0 e soma os valores para formar o número decimal correspondente.
A cada abertura da atividade um número binário aleatório será gerado e o aluno escolherá a alternativa correta.`;

  // Procura por uma atividade existente com esse título
  const existente = await prisma.atividade.findFirst({
    where: { titulo: { contains: titulo } },
  });

  if (existente) {
    // Atualiza campos relevantes (mantendo outras propriedades)
    const updateData: Prisma.AtividadeUpdateInput = {
      titulo,
      descricao,
      tipo: "PLUGGED",
      isStatic: true,
      source: "builtin",
      nota: 10,
    };

    const updated = await prisma.atividade.update({
      where: { idAtividade: existente.idAtividade },
      data: updateData,
    });
    console.log(`Seed: atividade atualizada (id: ${updated.idAtividade})`);
  } else {
    // Cria a atividade
    const createData: Prisma.AtividadeCreateInput = {
      titulo,
      descricao,
      tipo: "PLUGGED",
      isStatic: true,
      source: "builtin",
      nota: 10,
    };

    const created = await prisma.atividade.create({
      data: createData,
    });
    console.log(`Seed: atividade criada (id: ${created.idAtividade})`);
  }

  // Garante que a sequência do DB esteja sincronizada com o maior id atual
  await fixSequence();
}

main()
  .catch((e: unknown) => {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
    console.error("Seed error:", message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
