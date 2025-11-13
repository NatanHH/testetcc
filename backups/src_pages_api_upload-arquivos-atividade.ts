import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

// Garante que a pasta existe
const uploadDir = "./public/uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configura multer
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage: storage });

// Helper para lidar com multer em Next.js API routes
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false, // Importante para upload de arquivos
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: `Método '${req.method}' não permitido!` });
  }

  try {
    // Executa o middleware do multer
    await runMiddleware(req, res, upload.array("arquivos"));

    // @ts-ignore
    const files = req.files as Express.Multer.File[];
    // @ts-ignore
    const atividadeId = req.body.atividadeId;

    if (!atividadeId || !files || files.length === 0) {
      return res
        .status(400)
        .json({ error: "ID da atividade e arquivos são obrigatórios." });
    }

    // Salva no banco
    const arquivosCriados = await Promise.all(
      files.map((file) =>
        prisma.atividadeArquivo.create({
          data: {
            url: `/uploads/${file.filename}`,
            tipoArquivo: file.mimetype,
            atividadeId: Number(atividadeId),
          },
        })
      )
    );

    return res.status(200).json({ success: true, arquivos: arquivosCriados });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Erro interno no servidor." });
  }
}
