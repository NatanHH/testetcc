import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import fs from "fs";
import path from "path";
import prisma from "./prisma";

const uploadsRoot =
  process.env.UPLOADS_ROOT || path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsRoot,
  filename: (req, file, cb) => {
    const unique =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, unique);
  },
});
const upload = multer({ storage });

export const config = { api: { bodyParser: false } };

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) =>
      result instanceof Error ? reject(result) : resolve(result)
    );
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const idAtividade = Number(id);
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });
  if (Number.isNaN(idAtividade))
    return res.status(400).json({ error: "id inválido" });

  try {
    // @ts-ignore
    await runMiddleware(req, res, upload.single("wasmFile"));
    // @ts-ignore
    const file = req.file as Express.Multer.File;
    if (!file)
      return res
        .status(400)
        .json({ error: "arquivo wasm não enviado (campo wasmFile)" });

    const wasmUrl = path.join("/uploads", file.filename).replace(/\\/g, "/");
    // use a dynamic-typed object so TypeScript won't enforce Prisma's generated keys here
    const updateData: any = { wasmUrl, linguagem: "assemblyscript" };
    await prisma.atividade.update({
      where: { idAtividade },
      data: updateData,
    });

    return res.status(200).json({ success: true, wasmUrl });
  } catch (err: any) {
    console.error("Erro upload-wasm:", err);
    return res.status(500).json({ error: err?.message || "Erro interno" });
  }
}
