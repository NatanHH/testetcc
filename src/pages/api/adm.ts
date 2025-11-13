import type { NextApiRequest, NextApiResponse } from "next";
import _prisma from "../../lib/prisma";

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
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const senha = typeof body.senha === "string" ? body.senha : "";

  if (!email || !senha) {
    return res.status(400).json({ error: "email e senha são obrigatórios" });
  }

  try {
    // ...existing logic usando email e senha com prisma...
    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("POST /api/adm error:", msg);
    return res.status(500).json({ error: "Erro interno" });
  }
}
