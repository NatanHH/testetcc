import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const { turmaId } = req.query;
    if (!turmaId)
      return res.status(400).json({ error: "turmaId é obrigatório" });
    try {
      const atividadesTurma = await prisma.atividadeTurma.findMany({
        where: { idTurma: Number(turmaId) },
        include: {
          atividade: true,
        },
      });
      // Retorna só as atividades
      const atividades = atividadesTurma.map((rel) => rel.atividade);
      return res.status(200).json(atividades);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }
  return res.status(405).json({ error: "Método não permitido" });
}
