import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const alunoIdRaw = req.query.alunoId;
    const alunoId = alunoIdRaw !== undefined ? Number(String(alunoIdRaw)) : NaN;
    if (Number.isNaN(alunoId))
      return res.status(400).json({ error: "alunoId numeric required" });

    const turmaLinks = await prisma.turmaAluno.findMany({
      where: { idAluno: alunoId },
    });
    const turmaIds = turmaLinks.map((t) => t.idTurma);

    const atividadeTurma = await prisma.atividadeTurma.findMany({
      where: { idTurma: { in: turmaIds.length ? turmaIds : [-1] } },
      include: { atividade: true, turma: true, professor: true },
      orderBy: { dataAplicacao: "desc" },
      take: 50,
    });

    const totalAtividadeTurma = await prisma.atividadeTurma.count();
    const totalTurmaAluno = await prisma.turmaAluno.count();

    return res.status(200).json({
      alunoId,
      turmaLinksCount: turmaLinks.length,
      turmaIds,
      atividadeTurmaCountForThisAluno: atividadeTurma.length,
      sampleAtividadeTurma: atividadeTurma.map((a) => ({
        idAtividadeTurma: a.idAtividadeTurma,
        idAtividade: a.idAtividade,
        idTurma: a.idTurma,
        idProfessor: a.idProfessor,
        dataAplicacao: a.dataAplicacao?.toISOString() ?? null,
        atividadeTitulo: a.atividade?.titulo ?? null,
        turmaNome: a.turma?.nome ?? null,
        professorId: a.professor?.idProfessor ?? null,
      })),
      totals: {
        atividadeTurma: totalAtividadeTurma,
        turmaAluno: totalTurmaAluno,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("/api/debug/db-report error:", msg);
    return res.status(500).json({ error: msg });
  }
}
