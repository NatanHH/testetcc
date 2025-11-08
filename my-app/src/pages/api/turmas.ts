import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { professorId, alunoId } = req.query;

    if (alunoId !== undefined) {
      const id = Number(String(alunoId));
      if (Number.isNaN(id))
        return res.status(400).json({ error: "alunoId inválido" });

      // find turmas that contain this aluno
      const turmas = await prisma.turma.findMany({
        where: {
          alunos: {
            some: { idAluno: id },
          },
        },
        include: {
          alunos: {
            include: {
              aluno: { select: { idAluno: true, nome: true, email: true } },
            },
          },
        },
        orderBy: { nome: "asc" },
      });

      return res.status(200).json(turmas);
    }

    if (professorId !== undefined) {
      const id = Number(String(professorId));
      if (Number.isNaN(id))
        return res.status(400).json({ error: "professorId inválido" });

      const turmas = await prisma.turma.findMany({
        where: { professorId: id },
        include: {
          alunos: {
            include: {
              aluno: { select: { idAluno: true, nome: true, email: true } },
            },
          },
          _count: { select: { alunos: true } },
        },
        orderBy: { nome: "asc" },
      });

      return res.status(200).json(turmas);
    }

    return res.status(400).json({ error: "Informe professorId ou alunoId" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/turmas error:", msg);
    return res.status(500).json({ error: "Erro interno" });
  }
}
