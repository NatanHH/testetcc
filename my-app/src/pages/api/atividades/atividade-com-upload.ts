import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import prisma from "../../../lib/prisma";
import type { Prisma, TipoAtividade } from "@prisma/client";

export const config = { api: { bodyParser: false } };

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

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

// helper to run middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: unknown) {
  return new Promise<void>((resolve, reject) => {
    try {
      if (typeof fn !== "function")
        return reject(new Error("middleware is not a function"));
      // call middleware with safe typing
      (
        fn as (
          req: unknown,
          res: unknown,
          next: (result?: unknown) => void
        ) => void
      )(req, res, (result?: unknown) => {
        if (result instanceof Error) return reject(result);
        resolve();
      });
    } catch (err) {
      reject(err);
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
    await runMiddleware(req, res, upload.array("arquivos"));
    const r = req as NextApiRequest & {
      files?: Express.Multer.File[];
      body?: Record<string, unknown>;
    };

    // fields
    const tituloRaw = r.body?.titulo;
    const descricaoRaw = r.body?.descricao;
    const tipoRaw = r.body?.tipo;
    const notaRaw =
      r.body?.nota ?? r.body?._payload_nota ?? r.body?.payload_nota;
    const scriptRaw = r.body?.script;
    const linguagemRaw = r.body?.linguagem;
    const alternativasRaw = r.body?.alternativas;

    const titulo = typeof tituloRaw === "string" ? tituloRaw.trim() : "";
    if (!titulo) {
      // cleanup uploaded
      for (const f of r.files ?? [])
        try {
          fs.unlinkSync(path.join(uploadDir, f.filename));
        } catch {}
      return res.status(400).json({ error: "titulo é obrigatório" });
    }

    const tipo =
      typeof tipoRaw === "string" ? tipoRaw.trim().toUpperCase() : "";
    const allowedTipos = ["PLUGGED", "UNPLUGGED"];
    if (!allowedTipos.includes(tipo)) {
      for (const f of r.files ?? [])
        try {
          fs.unlinkSync(path.join(uploadDir, f.filename));
        } catch {}
      return res.status(400).json({ error: "tipo inválido" });
    }

    const nota = Number(notaRaw);
    if (notaRaw === undefined || Number.isNaN(nota)) {
      for (const f of r.files ?? [])
        try {
          fs.unlinkSync(path.join(uploadDir, f.filename));
        } catch {}
      return res
        .status(400)
        .json({ error: "nota é obrigatória e deve ser numérica" });
    }

    // parse alternativas if present (could be JSON string)
    let alternativas: unknown = undefined;
    if (typeof alternativasRaw === "string") {
      try {
        alternativas = JSON.parse(alternativasRaw);
      } catch {
        alternativas = undefined;
      }
    } else if (Array.isArray(alternativasRaw)) alternativas = alternativasRaw;

    // create atividade record
    const data: Prisma.AtividadeCreateInput = {
      titulo,
      descricao:
        typeof descricaoRaw === "string" && descricaoRaw.trim().length > 0
          ? descricaoRaw.trim()
          : null,
      tipo: tipo as TipoAtividade,
      nota,
      script:
        typeof scriptRaw === "string" && scriptRaw.trim().length > 0
          ? scriptRaw.trim()
          : null,
      linguagem:
        typeof linguagemRaw === "string" && linguagemRaw.trim().length > 0
          ? linguagemRaw.trim()
          : null,
      ...(Array.isArray(alternativas) && alternativas.length > 0
        ? {
            alternativas: {
              create: alternativas.map((a: unknown) => {
                if (typeof a === "string") {
                  return { texto: a, correta: false };
                }
                if (a && typeof a === "object") {
                  const rec = a as Record<string, unknown>;
                  return {
                    texto: String(rec.texto ?? ""),
                    correta: !!rec.correta,
                  };
                }
                return { texto: String(a ?? ""), correta: false };
              }),
            },
          }
        : {}),
    };

    const createdAtividade = await prisma.atividade.create({ data });

    // handle files
    const files = r.files ?? [];
    const createdFiles: import("@prisma/client").AtividadeArquivo[] = [];
    const errors: { filename: string; message: string }[] = [];

    for (const f of files) {
      if (!allowedMimes.includes(f.mimetype)) {
        try {
          fs.unlinkSync(path.join(uploadDir, f.filename));
        } catch {}
        errors.push({
          filename: f.originalname,
          message: "Tipo de arquivo não permitido",
        });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        try {
          fs.unlinkSync(path.join(uploadDir, f.filename));
        } catch {}
        errors.push({
          filename: f.originalname,
          message: "Arquivo muito grande",
        });
        continue;
      }

      const fileUrl = `/upload/${path.basename(f.filename)}`;
      try {
        const rec = await prisma.atividadeArquivo.create({
          data: {
            url: fileUrl,
            tipoArquivo: f.mimetype,
            atividadeId: createdAtividade.idAtividade,
          },
        });
        createdFiles.push(rec);
      } catch (dbErr: unknown) {
        const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        console.error("Erro ao gravar arquivo no DB:", msg);
        errors.push({
          filename: f.originalname,
          message: "Erro ao salvar no banco",
        });
        try {
          fs.unlinkSync(path.join(uploadDir, f.filename));
        } catch {}
      }
    }

    const result = {
      atividade: createdAtividade,
      arquivos: createdFiles,
      errors,
    };
    return res.status(201).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("atividade-com-upload error:", msg);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
