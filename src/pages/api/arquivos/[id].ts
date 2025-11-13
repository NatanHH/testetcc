import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const rawId = Array.isArray(req.query.id)
    ? req.query.id[0]
    : String(req.query.id);
  if (!rawId) return res.status(400).json({ error: "Missing id" });
  const idNum = Number(rawId);
  // se você usa id numérico:
  if (Number.isNaN(idNum)) return res.status(400).json({ error: "Invalid id" });
  // ...use idNum ou rawId conforme necessário...

  if (req.method === "GET") {
    // ...buscar arquivo por id...
    return res.status(200).json({});
  }

  if (req.method === "DELETE") {
    // ...remover arquivo...
    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
