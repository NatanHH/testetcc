import type { NextApiRequest, NextApiResponse } from "next";
import _prisma from "../../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  if (req.method === "GET") {
    // listar attachments
    return res.status(200).json([]);
  }

  if (req.method === "POST") {
    // tratar upload/association
    const payload: unknown = req.body;
    if (typeof payload !== "object" || payload === null)
      return res.status(400).json({ error: "Invalid body" });
    const _body = payload as { nome?: string };
    return res.status(201).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
