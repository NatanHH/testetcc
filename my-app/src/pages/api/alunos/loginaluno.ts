import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, senha } = req.body ?? {};
  if (typeof email !== "string" || typeof senha !== "string") {
    return res.status(400).json({ error: "email and senha required" });
  }

  try {
    const emailNorm = email.trim().toLowerCase();

    // try case-normalized lookup first
    let aluno = await prisma.aluno.findUnique({ where: { email: emailNorm } });
    if (!aluno) {
      // fallback: try case-sensitive/other lookups
      aluno =
        (await prisma.aluno.findFirst({ where: { email } })) ??
        (await prisma.aluno.findFirst({ where: { nome: email } }));
    }

    if (!aluno) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const stored = aluno.senha as string | null;
    let passwordMatches = false;
    if (typeof stored === "string") {
      try {
        passwordMatches = await bcrypt.compare(senha, stored);
      } catch {
        // fallback to direct compare if stored isn't a bcrypt hash
        passwordMatches = senha === stored;
      }
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    return res.status(200).json({
      success: true,
      idAluno: aluno.idAluno,
      nome: aluno.nome,
      email: aluno.email,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("loginaluno error:", msg);
    return res.status(500).json({ error: msg });
  }
}
