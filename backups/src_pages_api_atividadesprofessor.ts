import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const atividades = await prisma.atividade.findMany({
        include: {
          arquivos: true,
          alternativas: true,
          turmas: true,
        },
      });
      return res.status(200).json(atividades);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }
  return res.status(405).json({ error: "Método não permitido" });
}
