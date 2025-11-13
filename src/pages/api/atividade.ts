import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    console.log("Recebi POST /api/atividade body:", req.body);
    // retorna JSON mínimo de teste:
    return res
      .status(201)
      .json({ idAtividade: 123, mensagem: "dummy created" });
  }
  res.setHeader("Allow", "POST");
  res.status(405).json({ error: "Método não permitido" });
}
