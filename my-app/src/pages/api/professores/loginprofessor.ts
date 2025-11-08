import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const payload: unknown = req.body;
  if (typeof payload !== "object" || payload === null)
    return res.status(400).json({ error: "Invalid body" });

  const body = payload as { email?: string; senha?: string };
  const email = body.email ?? "";
  const senha = body.senha ?? "";

  try {
    const professor = await prisma.professor.findUnique({ where: { email } });
    if (!professor || professor.senha !== senha) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    return res.status(200).json({
      success: true,
      idProfessor: professor.idProfessor,
      nome: professor.nome,
      email: professor.email,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("loginprofessor error:", msg);
    return res.status(500).json({ error: msg });
  }
}
