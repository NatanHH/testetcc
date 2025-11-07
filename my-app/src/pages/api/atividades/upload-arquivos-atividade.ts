import type { NextApiRequest, NextApiResponse } from "next";
import type {
  RequestHandler,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import prisma from "../../../lib/prisma";
import type { AtividadeArquivo } from "@prisma/client";

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), "public", "upload");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname) || "";
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const allowedMimes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

function fileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  cb(null, allowedMimes.includes(file.mimetype));
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// typed request shape used when multer runs
type MulterReq = NextApiRequest & {
  files?: Express.Multer.File[];
  body?: Record<string, unknown>;
};

// helper to run middleware (accept Express RequestHandler safely)
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: unknown
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const mw = fn as RequestHandler;
      mw(
        req as unknown as ExpressRequest,
        res as unknown as ExpressResponse,
        (result?: unknown) => {
          if (result instanceof Error) return reject(result);
          resolve();
        }
      );
    } catch (e) {
      reject(e);
    }
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // run multer
    await runMiddleware(req, res, upload.array("arquivos"));
    const r = req as MulterReq;

    const atividadeIdRaw = r.body?.atividadeId ?? r.body?.atividade_id;
    const atividadeId =
      atividadeIdRaw !== undefined ? Number(atividadeIdRaw) : NaN;
    if (!atividadeId || Number.isNaN(atividadeId)) {
      // cleanup any uploaded files
      for (const f of r.files ?? []) {
        try {
          fs.unlinkSync(path.join(uploadDir, f.filename));
        } catch {}
      }
      return res
        .status(400)
        .json({ error: "atividadeId é obrigatório e deve ser numérico" });
    }

    const files = r.files ?? [];
    if (files.length === 0)
      return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const created: AtividadeArquivo[] = [];
    const errors: { filename: string; message: string }[] = [];

    const atividadeExists = await prisma.atividade.findUnique({
      where: { idAtividade: atividadeId },
    });
    if (!atividadeExists) {
      for (const f of files) {
        try {
          fs.unlinkSync(path.join(uploadDir, f.filename));
        } catch {}
      }
      return res.status(400).json({ error: "Atividade não encontrada" });
    }

    for (const f of files) {
      if (!allowedMimes.includes(f.mimetype)) {
        try {
          fs.unlinkSync(f.path);
        } catch {}
        errors.push({
          filename: f.originalname,
          message: "Tipo de arquivo não permitido",
        });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        try {
          fs.unlinkSync(f.path);
        } catch {}
        errors.push({
          filename: f.originalname,
          message: "Arquivo excede o tamanho máximo (5MB)",
        });
        continue;
      }

      const fileUrl = `/upload/${path.basename(f.filename)}`;
      try {
        const record = await prisma.atividadeArquivo.create({
          data: { url: fileUrl, tipoArquivo: f.mimetype, atividadeId },
        });
        created.push(record);
      } catch (dbErr: unknown) {
        const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        console.error("Erro ao gravar DB para arquivo:", f.originalname, msg);
        errors.push({
          filename: f.originalname,
          message: "Erro ao salvar no banco",
        });
        try {
          fs.unlinkSync(f.path);
        } catch {}
      }
    }

    if (created.length === 0)
      return res.status(400).json({ uploaded: 0, arquivos: [], errors });
    return res
      .status(201)
      .json({ uploaded: created.length, arquivos: created, errors });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Upload handler error:", msg);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
