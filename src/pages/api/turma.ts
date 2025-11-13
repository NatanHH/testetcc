import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import type { Aluno } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: Buscar turmas do professor
  if (req.method === "GET") {
    const { professorId } = req.query;

    if (!professorId) {
      return res.status(400).json({ error: "professorId é obrigatório" });
    }

    try {
      const turmas = await prisma.turma.findMany({
        where: {
          professorId: Number(professorId),
        },
        include: {
          alunos: {
            include: {
              aluno: {
                select: {
                  idAluno: true,
                  nome: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: { alunos: true },
          },
        },
        orderBy: {
          nome: "asc",
        },
      });

      return res.status(200).json(turmas);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao buscar turmas:", msg);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  // POST: Criar turma
  if (req.method === "POST") {
    const { nomeTurma, professorId, alunos } = req.body;

    if (!nomeTurma || !professorId || !Array.isArray(alunos)) {
      return res.status(400).json({
        error: "nomeTurma, professorId e alunos (array) são obrigatórios",
      });
    }

    try {
      // operação atômica para evitar duplicação
      const result = await prisma.$transaction(async (tx) => {
        // 1) verifica se já existe turma com mesmo nome e professor
        let turma = await tx.turma.findFirst({
          where: {
            nome: nomeTurma,
            professorId: Number(professorId),
          },
        });

        // 2) se não existir, cria a turma (uma única criação)
        if (!turma) {
          turma = await tx.turma.create({
            data: {
              nome: nomeTurma,
              professorId: Number(professorId),
            },
          });
        }

        // 3) para cada aluno: upsert (por email) e criar relação turmaAluno se ainda não existir
        const alunosCriados: Aluno[] = [];
        for (const a of alunos) {
          const rec = a as Record<string, unknown>;
          const emailAluno =
            typeof rec.email === "string" ? rec.email : undefined;
          if (!emailAluno) continue;

          // assume que Aluno.email é único no schema
          const aluno = await tx.aluno.upsert({
            where: { email: emailAluno },
            update: {
              nome: typeof rec.nome === "string" ? rec.nome : emailAluno,
            },
            create: {
              nome: typeof rec.nome === "string" ? rec.nome : emailAluno,
              email: emailAluno,
              senha: typeof rec.senha === "string" ? rec.senha : "", // ajuste conforme seu modelo
            },
          });

          // cria relação apenas se ainda não existir
          const rel = await tx.turmaAluno.findFirst({
            where: {
              idTurma: turma.idTurma,
              idAluno: aluno.idAluno,
            },
          });

          if (!rel) {
            await tx.turmaAluno.create({
              data: {
                idTurma: turma.idTurma,
                idAluno: aluno.idAluno,
              },
            });
          }

          alunosCriados.push(aluno);
        }

        return { turma, alunos: alunosCriados };
      }); // end transaction

      return res.status(201).json({
        message: "Turma criada/atualizada com sucesso",
        turma: result.turma,
        alunos: result.alunos,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao criar turma:", msg);
      return res.status(500).json({ error: "Erro interno", details: msg });
    }
  }

  // DELETE: Excluir turma
  if (req.method === "DELETE") {
    const { turmaId } = req.body;

    if (!turmaId) {
      return res.status(400).json({ error: "turmaId é obrigatório" });
    }

    try {
      // Verificar se a turma existe e se pertence a algum professor
      const turmaExistente = await prisma.turma.findUnique({
        where: { idTurma: Number(turmaId) },
        include: {
          alunos: true,
          atividades: true,
        },
      });

      if (!turmaExistente) {
        return res.status(404).json({ error: "Turma não encontrada" });
      }

      // Remover relacionamentos primeiro
      // 1. Capturar ids dos alunos vinculados antes de remover as relações
      const alunoIds =
        turmaExistente.alunos?.map((ta) => {
          const rec = ta as Record<string, unknown>;
          return Number(rec.idAluno);
        }) || [];

      // 2. Remover alunos da turma (tabela de junção)
      await prisma.turmaAluno.deleteMany({
        where: { idTurma: Number(turmaId) },
      });

      // 3. Remover associações atividade <-> turma (tabela de junção)
      await prisma.atividadeTurma.deleteMany({
        where: { idTurma: Number(turmaId) },
      });

      // 4. Deletar alunos que ficaram sem nenhuma turma (remover logins)
      if (alunoIds.length > 0) {
        const alunosParaDeletar: number[] = [];

        for (const idAluno of alunoIds) {
          const relacionamentos = await prisma.turmaAluno.count({
            where: { idAluno: idAluno },
          });

          // se não existem mais relações com turmas, marcar para deletar
          if (relacionamentos === 0) {
            alunosParaDeletar.push(idAluno);
          }
        }

        if (alunosParaDeletar.length > 0) {
          await prisma.aluno.deleteMany({
            where: { idAluno: { in: alunosParaDeletar } },
          });
        }
      }

      // 5. Finalmente, excluir a turma
      await prisma.turma.delete({
        where: { idTurma: Number(turmaId) },
      });

      return res.status(200).json({
        message: "Turma excluída com sucesso",
        turmaExcluida: turmaExistente.nome,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao excluir turma:", msg);
      return res.status(500).json({
        error: "Erro interno ao excluir turma",
        details: msg,
      });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}
