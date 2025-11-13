import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id)
    return res.status(400).json({ error: "Missing resposta id in path" });
  const idResposta = Number(id);
  if (Number.isNaN(idResposta))
    return res.status(400).json({ error: "Invalid resposta id" });

  if (req.method === "GET") {
    try {
      const found = await prisma.respostaAlunoAtividade.findUnique({
        where: { idResposta },
        include: {
          aluno: { select: { idAluno: true, nome: true, email: true } },
        },
      });
      if (!found)
        return res.status(404).json({ error: "Resposta não encontrada" });
      return res.status(200).json({ resposta: found });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("GET /api/respostas/[id] error:", msg);
      return res.status(500).json({
        error: "Internal server error",
        detail: msg,
      });
    }
  }

  if (req.method === "PATCH") {
    try {
      const payload: unknown = req.body;
      const dataToUpdate: { notaObtida?: number; feedback?: string | null } =
        {};
      if (payload && typeof payload === "object") {
        const p = payload as Record<string, unknown>;
        if (p.notaObtida !== undefined) {
          const n = Number(p.notaObtida);
          if (Number.isNaN(n))
            return res.status(400).json({ error: "notaObtida inválida" });
          dataToUpdate.notaObtida = n;
        }
        if (p.feedback !== undefined) {
          dataToUpdate.feedback =
            p.feedback === null ? null : String(p.feedback);
        }
      }
      if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ error: "Nenhum campo para atualizar" });
      }

      const updated = await prisma.respostaAlunoAtividade.update({
        where: { idResposta },
        data: dataToUpdate,
        include: {
          aluno: { select: { idAluno: true, nome: true, email: true } },
        },
      });
      return res.status(200).json({ resposta: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("PATCH /api/respostas/[id] error:", msg);
      if (msg.includes("Record to update not found")) {
        return res.status(404).json({ error: "Resposta não encontrada" });
      }
      return res.status(500).json({
        error: "Internal server error",
        detail: msg,
      });
    }
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}
