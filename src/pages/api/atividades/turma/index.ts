import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";

/**
 * GET /api/atividades/turma?turmaId=#
 *
 * Retorna as atividades aplicadas na turma (AtividadeTurma join Atividade).
 * Cada item inclui metadados da aplicação (idAtividadeTurma, dataAplicacao, idProfessor)
 * e os campos principais da Atividade (titulo, descricao, tipo, nota).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { turmaId } = req.query;
    if (!turmaId) {
      return res.status(400).json({ error: "Missing turmaId query parameter" });
    }
    const idTurma = Number(turmaId);
    if (Number.isNaN(idTurma)) {
      return res.status(400).json({ error: "turmaId must be a number" });
    }

    const aplicacoes = await prisma.atividadeTurma.findMany({
      where: { idTurma: idTurma },
      include: {
        atividade: {
          select: {
            idAtividade: true,
            titulo: true,
            descricao: true,
            tipo: true,
            nota: true,
            professorId: true,
          },
        },
        professor: {
          select: { idProfessor: true, nome: true, email: true },
        },
      },
      orderBy: { dataAplicacao: "desc" },
    });

    const result = aplicacoes.map((a) => ({
      idAtividadeTurma: a.idAtividadeTurma,
      idAtividade: a.idAtividade,
      dataAplicacao: a.dataAplicacao,
      idProfessorAplicou: a.idProfessor ?? null,
      professorAplicou: a.professor ?? null,
      // dados da atividade (compatibilidade com frontend)
      titulo: a.atividade?.titulo ?? null,
      descricao: a.atividade?.descricao ?? null,
      tipo: a.atividade?.tipo ?? null,
      nota: a.atividade?.nota ?? null,
      atividade: a.atividade ?? null,
    }));

    return res.status(200).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/atividades/turma error:", msg);
    return res.status(500).json({
      error: "Internal server error",
      detail: msg,
    });
  }
}
