import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const {
      titulo,
      descricao,
      tipo,
      nota,
      script,
      linguagem,
      professorId,
      alternativas, // optional: [{ texto: string, correta: boolean }, ...]
    } = req.body;

    try {
      // validação básica
      if (!titulo || !tipo) {
        return res
          .status(400)
          .json({ error: "titulo e tipo são obrigatórios" });
      }

      if (tipo === "PLUGGED") {
        if (!Array.isArray(alternativas) || alternativas.length === 0) {
          return res.status(400).json({
            error: "Atividades PLUGGED precisam de pelo menos uma alternativa",
          });
        }
        const hasCorrect = alternativas.some((a: any) => !!a.correta);
        if (!hasCorrect) {
          return res
            .status(400)
            .json({ error: "Marque ao menos uma alternativa como correta" });
        }
      }

      // preparar nested create para alternativas (se houver)
      const alternativasCreate = Array.isArray(alternativas)
        ? alternativas
            .map((a: any) => ({
              texto: String(a.texto ?? ""),
              correta: !!a.correta,
            }))
            .filter((a: any) => a.texto.trim() !== "")
        : undefined;

      const atividade = await prisma.atividade.create({
        data: {
          titulo,
          descricao: descricao ?? null,
          tipo,
          nota: Number(nota) || 0,
          script: tipo === "PLUGGED" ? script ?? null : null,
          linguagem: tipo === "PLUGGED" ? linguagem ?? null : null,
          professorId: professorId ?? null,
          ...(alternativasCreate
            ? { alternativas: { create: alternativasCreate } }
            : {}),
        },
        include: {
          arquivos: true,
          alternativas: true,
        },
      });

      return res.status(201).json(atividade);
    } catch (e: any) {
      console.error("Erro POST /api/atividade:", e);
      return res
        .status(400)
        .json({ error: e?.message || "Erro ao criar atividade" });
    }
  } else if (req.method === "GET") {
    try {
      const atividades = await prisma.atividade.findMany({
        include: {
          arquivos: true,
          alternativas: true,
        },
      });
      return res.status(200).json(atividades);
    } catch (e: any) {
      console.error("Erro GET /api/atividade:", e);
      return res.status(400).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}
