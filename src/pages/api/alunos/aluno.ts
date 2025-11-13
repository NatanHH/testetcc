import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    // exemplo: listar alunos
    const { id, idAluno } = req.query;
    if (id !== undefined || idAluno !== undefined) {
      const target = Number(String(id ?? idAluno));
      if (Number.isNaN(target))
        return res.status(400).json({ error: "id inválido" });
      const aluno = await prisma.aluno.findUnique({
        where: { idAluno: target },
        select: { idAluno: true, nome: true, email: true },
      });
      if (!aluno)
        return res.status(404).json({ error: "Aluno não encontrado" });
      return res.status(200).json(aluno);
    }

    const alunos = await prisma.aluno.findMany();
    return res.status(200).json(alunos);
  }

  if (req.method === "POST") {
    // trate o body como `unknown` e faça validações de tipo antes de usar
    const payload: unknown = req.body;
    if (typeof payload !== "object" || payload === null) {
      return res.status(400).json({ error: "Payload inválido" });
    }

    const { nome, email, senha } = payload as {
      nome?: unknown;
      email?: unknown;
      senha?: unknown;
    };

    if (typeof nome !== "string" || typeof email !== "string") {
      return res
        .status(400)
        .json({ error: "Campos obrigatórios ausentes: nome e email" });
    }

    // agora é seguro assumir tipos corretos
    const nomeStr = nome as string;
    const emailStr = email as string;
    const senhaStr = typeof senha === "string" ? senha : "";

    try {
      // sanitize inputs: convert empty strings to undefined so Prisma won't set empty values
      const nomeVal =
        typeof nomeStr === "string" && nomeStr.trim().length > 0
          ? nomeStr.trim()
          : undefined;
      const emailVal =
        typeof emailStr === "string" && emailStr.trim().length > 0
          ? emailStr.trim()
          : undefined;
      const senhaVal =
        typeof senhaStr === "string" && senhaStr.trim().length > 0
          ? senhaStr
          : undefined;

      // required by your Prisma schema: nome, email e senha são obrigatórios
      if (!nomeVal || !emailVal || !senhaVal) {
        return res
          .status(400)
          .json({ error: "nome, email e senha são obrigatórios" });
      }

      const created = await prisma.aluno.create({
        data: {
          nome: nomeVal,
          email: emailVal,
          senha: senhaVal,
        },
      });
      return res.status(201).json(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      // trata duplicata de email (Prisma P2002) com status 409
      // acessa o campo `code` de forma segura sem usar `any`
      const code =
        typeof err === "object" && err !== null
          ? (err as Record<string, unknown>)["code"]
          : undefined;
      if (code === "P2002") {
        return res.status(409).json({ error: "Email já cadastrado" });
      }

      console.error("Erro criando aluno:", msg);
      return res.status(500).json({ error: "Erro ao criar aluno." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
