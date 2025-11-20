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

  // PUT: Atualizar nome da turma
  if (req.method === "PUT") {
    const { idTurma, nome } = req.body;

    if (!idTurma || !nome) {
      return res.status(400).json({ error: "idTurma e nome são obrigatórios" });
    }

    try {
      const turmaAtualizada = await prisma.turma.update({
        where: { idTurma: Number(idTurma) },
        data: { nome: String(nome) },
      });

      return res.status(200).json({
        message: "Turma atualizada com sucesso",
        turma: turmaAtualizada,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao atualizar turma:", msg);
      return res.status(500).json({ error: "Erro interno", details: msg });
    }
  }

  // DELETE: Excluir turma ou remover aluno da turma
  if (req.method === "DELETE") {
    const {
      turmaId: turmaIdQuery,
      idTurma: idTurmaQuery,
      idAluno: idAlunoQuery,
    } = req.query;
    const { turmaId: turmaIdBody } = req.body;

    console.log("DELETE request received:", {
      query: req.query,
      body: req.body,
      turmaIdQuery,
      idTurmaQuery,
      idAlunoQuery,
      turmaIdBody,
    });

    const turmaId = turmaIdQuery || idTurmaQuery || turmaIdBody;
    const idAluno = idAlunoQuery;

    console.log("Parsed values:", { turmaId, idAluno });

    if (!turmaId) {
      console.log("Error: turmaId is missing");
      return res.status(400).json({ error: "turmaId é obrigatório" });
    }

    // Se idAluno foi fornecido, remover apenas o aluno da turma
    if (idAluno) {
      console.log("Attempting to remove aluno from turma");
      try {
        const turmaIdNum = Number(turmaId);
        const idAlunoNum = Number(idAluno);

        console.log("Converted to numbers:", { turmaIdNum, idAlunoNum });

        if (isNaN(turmaIdNum) || isNaN(idAlunoNum)) {
          console.log("Error: IDs are not valid numbers");
          return res.status(400).json({ error: "IDs inválidos" });
        }

        console.log("Calling prisma.turmaAluno.deleteMany...");
        const deleted = await prisma.turmaAluno.deleteMany({
          where: {
            idTurma: turmaIdNum,
            idAluno: idAlunoNum,
          },
        });

        console.log("Delete result:", deleted);

        if (deleted.count === 0) {
          return res.status(404).json({
            error: "Relação aluno-turma não encontrada",
          });
        }

        return res.status(200).json({
          message: "Aluno removido da turma com sucesso",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Erro ao remover aluno da turma:", msg);
        return res.status(500).json({
          error: "Erro interno ao remover aluno",
          details: msg,
        });
      }
    }

    // Caso contrário, excluir a turma inteira
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
