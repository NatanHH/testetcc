import type { NextApiRequest, NextApiResponse } from "next";
import _prisma from "../../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id: _id } = req.query;
  if (req.method === "GET") {
    // retornar arquivo
    return res.status(200).json({});
  }
  if (req.method === "DELETE") {
    // deletar arquivo
    return res.status(204).end();
  }
  return res.status(405).json({ error: "Method not allowed" });
}
