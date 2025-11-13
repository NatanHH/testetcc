import type { NextApiRequest, NextApiResponse } from "next";

export const config = { api: { bodyParser: false } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const payload: unknown = req.body;
  if (typeof payload === "object" && payload !== null) {
    const body = payload as Record<string, unknown>;
    const atividadeIdRaw = body.atividadeId ?? body.atividade_id;
    const atividadeId =
      atividadeIdRaw !== undefined ? Number(atividadeIdRaw) : undefined;
    if (atividadeId === undefined || Number.isNaN(atividadeId)) {
      return res
        .status(400)
        .json({ error: "atividadeId obrigatório e numérico" });
    }
    // ...lógica de upload usando atividadeId (number) ...
  }

  return res.status(200).json({ ok: true });
}
