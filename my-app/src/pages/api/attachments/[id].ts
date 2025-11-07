import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const rawId = Array.isArray(req.query.id)
    ? req.query.id[0]
    : String(req.query.id ?? "");
  if (!rawId) return res.status(400).json({ error: "Missing id" });
  const idNum = Number(rawId);
  if (Number.isNaN(idNum)) return res.status(400).json({ error: "Invalid id" });

  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const rec = await prisma.atividadeArquivo.findUnique({
      where: { idArquivo: idNum },
    });
    if (!rec) return res.status(404).json({ error: "Attachment not found" });

    const url = rec.url ?? "";

    // If the stored URL is an absolute remote URL, redirect there.
    if (/^https?:\/\//i.test(url)) {
      return res.redirect(url);
    }

    // If it's a relative path (e.g. /upload/...), redirect to it so Next/static will serve from public/.
    if (url.startsWith("/")) {
      return res.redirect(url);
    }

    // otherwise return the URL in JSON as fallback
    return res.status(200).json({ url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("attachments handler error:", msg);
    return res.status(500).json({ error: "Internal server error" });
  }
}
