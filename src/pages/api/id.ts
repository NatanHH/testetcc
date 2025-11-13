import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const rawQ = req.query.q;
  // normaliza: se vier array, pega o primeiro; garante string
  const q =
    Array.isArray(rawQ) && rawQ.length > 0
      ? String(rawQ[0])
      : typeof rawQ === "string"
      ? rawQ
      : "";

  if (!q) return res.status(400).json({ error: "q é obrigatório" });

  return res.status(200).json({ q });
}
