import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { idAtividade, idTurma } = req.body;
    if (!idAtividade || !idTurma)
      return res
        .status(400)
        .json({ error: "idAtividade e idTurma são obrigatórios" });
    try {
      const relacao = await prisma.atividadeTurma.create({
        data: {
          idAtividade: Number(idAtividade),
          idTurma: Number(idTurma),
          dataAplicacao: new Date(),
        },
      });
      return res.status(200).json(relacao);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }
  return res.status(405).json({ error: "Método não permitido" });
}
