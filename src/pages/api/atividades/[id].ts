import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const atividade = await prisma.atividade.findUnique({
        where: { idAtividade: Number(id) },
        include: { arquivos: true, alternativas: true },
      });
      if (!atividade) return res.status(404).json({ error: "Não encontrado" });
      return res.status(200).json(atividade);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("GET /api/atividades/[id] error:", msg);
      return res.status(500).json({ error: msg || "Erro interno" });
    }
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    const payload: unknown = req.body;
    if (typeof payload !== "object" || payload === null) {
      return res.status(400).json({ error: "Invalid body" });
    }
    const body = payload as { titulo?: string; descricao?: string };
    try {
      const updated = await prisma.atividade.update({
        where: { idAtividade: Number(id) },
        data: body,
      });
      return res.status(200).json(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("PUT /api/atividades/[id] error:", msg);
      return res
        .status(500)
        .json({ error: msg || "Erro ao atualizar atividade" });
    }
  }

  if (req.method === "DELETE") {
    try {
      // tenta remover dependências antes de deletar (ignora erros caso tabelas não existam)
      await prisma.respostaAlunoAtividade
        ?.deleteMany?.({ where: { idAtividade: Number(id) } })
        .catch(() => {});
      await prisma.atividadeTurma
        ?.deleteMany?.({ where: { idAtividade: Number(id) } })
        .catch(() => {});
      await prisma.atividadeArquivo
        ?.deleteMany?.({
          where: { atividadeId: Number(id) },
        })
        .catch(() => {});
      await prisma.alternativa
        ?.deleteMany?.({ where: { idAtividade: Number(id) } })
        .catch(() => {});

      // por fim delete a atividade
      await prisma.atividade.delete({ where: { idAtividade: Number(id) } });

      return res.status(204).end();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("DELETE /api/atividades/[id] error:", msg);
      return res
        .status(500)
        .json({ error: msg || "Erro interno ao deletar atividade" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
