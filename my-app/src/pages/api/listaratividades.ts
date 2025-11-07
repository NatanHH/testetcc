import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const alunoIdRaw = req.query.alunoId;
    const alunoId = alunoIdRaw !== undefined ? Number(String(alunoIdRaw)) : NaN;

    // If alunoId provided and valid, return activities applied to the aluno's turma(s)
    if (!Number.isNaN(alunoId)) {
      // get turma ids for the aluno
      const turmaLinks = await prisma.turmaAluno.findMany({
        where: { idAluno: alunoId },
        select: { idTurma: true },
      });
      const turmaIds = turmaLinks.map((t) => t.idTurma);

      if (turmaIds.length === 0) return res.status(200).json([]);

      // find atividade-turma applications for these turmas and include atividade + turma
      const aplicacoes = await prisma.atividadeTurma.findMany({
        where: { idTurma: { in: turmaIds } },
        include: {
          atividade: {
            include: { arquivos: true },
          },
          turma: true,
          professor: true,
        },
        orderBy: { dataAplicacao: "desc" },
      });

      // map to atividade summary shape expected by the client
      const resultados = aplicacoes.map((ap) => {
        const at = ap.atividade;
        return {
          idAtividade: at.idAtividade,
          titulo: at.titulo,
          descricao: at.descricao ?? null,
          tipo: at.tipo,
          nota: at.nota ?? null,
          dataAplicacao: ap.dataAplicacao
            ? ap.dataAplicacao.toISOString()
            : null,
          turma: ap.turma
            ? { idTurma: ap.turma.idTurma, nome: ap.turma.nome }
            : null,
          arquivos: (at.arquivos || []).map((f) => ({
            idArquivo: f.idArquivo,
            url: f.url,
            tipoArquivo: f.tipoArquivo ?? null,
            nomeArquivo: null,
          })),
        };
      });

      return res.status(200).json(resultados);
    }

    // fallback: return all atividades (legacy behavior)
    const atividades = await prisma.atividade.findMany({
      include: { arquivos: true },
    });
    const mapped = atividades.map((at) => ({
      idAtividade: at.idAtividade,
      titulo: at.titulo,
      descricao: at.descricao ?? null,
      tipo: at.tipo,
      nota: at.nota ?? null,
      dataAplicacao: null,
      turma: null,
      arquivos: (at.arquivos || []).map((f) => ({
        idArquivo: f.idArquivo,
        url: f.url,
        tipoArquivo: f.tipoArquivo ?? null,
        nomeArquivo: null,
      })),
    }));

    return res.status(200).json(mapped);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/listaratividades error:", msg);
    return res.status(500).json({ error: msg || "Erro interno" });
  }
}
