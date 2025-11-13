import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      // ✅ Buscar todas as atividades, priorizando as fixas (builtin)
      const atividades = await prisma.atividade.findMany({
        include: {
          arquivos: true,
          alternativas: true,
          turmas: true,
        },
        orderBy: [
          { isStatic: "desc" }, // Atividades fixas primeiro
          { idAtividade: "desc" },
        ],
      });

      // ✅ Garantir que sempre inclua a atividade PLUGGED fixa
      const atividadePluggedFixa = atividades.find(
        (a) =>
          a.tipo === "PLUGGED" && a.isStatic === true && a.source === "builtin"
      );

      if (!atividadePluggedFixa) {
        // Se não encontrou, buscar explicitamente
        const fixa = await prisma.atividade.findFirst({
          where: {
            tipo: "PLUGGED",
            isStatic: true,
            source: "builtin",
          },
          include: {
            arquivos: true,
            alternativas: true,
            turmas: true,
          },
        });

        if (fixa) {
          // Adicionar no início da lista
          atividades.unshift(fixa);
        }
      }

      return res.status(200).json(atividades);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("GET /api/professores/atividadesprofessor error:", msg);
      return res.status(400).json({ error: msg });
    }
  }
  return res.status(405).json({ error: "Método não permitido" });
}
