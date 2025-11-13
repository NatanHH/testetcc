import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

type ProfessorPayload = {
  nome: string;
  email: string;
  senha: string;
};

function isProfessorPayload(x: unknown): x is ProfessorPayload {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.nome === "string" &&
    r.nome.trim().length > 0 &&
    typeof r.email === "string" &&
    r.email.trim().length > 0 &&
    typeof r.senha === "string" &&
    r.senha.length > 0
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const professores = await prisma.professor.findMany();
      return res.status(200).json(professores);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("GET /api/professores/professor error:", msg);
      return res.status(500).json({ error: "Erro ao listar professores" });
    }
  }

  if (req.method === "POST") {
    const payload: unknown = req.body;
    if (!isProfessorPayload(payload)) {
      return res
        .status(400)
        .json({ error: "Dados obrigatórios ausentes ou inválidos." });
    }
    const nome = payload.nome.trim();
    const email = payload.email.trim();
    const senha = payload.senha; // aplicar hashing se necessário

    try {
      const novoProfessor = await prisma.professor.create({
        data: {
          nome,
          email,
          senha,
        },
      });
      return res.status(201).json(novoProfessor);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Prisma unique constraint (email) -> P2002
      if ((err as Record<string, unknown>)?.code === "P2002") {
        return res.status(409).json({ error: "Email já cadastrado" });
      }
      console.error("POST /api/professores/professor error:", msg);
      return res.status(400).json({ error: msg });
    }
  }

  if (req.method === "PUT") {
    const payload: unknown = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Payload inválido" });
    }
    const body = payload as Record<string, unknown>;
    const idProfessor = Number(body.idProfessor);
    if (!idProfessor || Number.isNaN(idProfessor)) {
      return res
        .status(400)
        .json({ error: "idProfessor obrigatório e numérico." });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.nome === "string" && body.nome.trim().length > 0)
      updateData.nome = body.nome.trim();
    if (typeof body.email === "string" && body.email.trim().length > 0)
      updateData.email = body.email.trim();
    if (typeof body.senha === "string" && body.senha.length > 0)
      updateData.senha = body.senha;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar." });
    }

    try {
      const professorAtualizado = await prisma.professor.update({
        where: { idProfessor },
        data: updateData,
      });
      return res.status(200).json(professorAtualizado);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("PUT /api/professores/professor error:", msg);
      return res.status(400).json({ error: msg });
    }
  }

  if (req.method === "DELETE") {
    const payload: unknown = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Payload inválido" });
    }
    const body = payload as Record<string, unknown>;
    const idProfessor = Number(body.idProfessor);
    if (!idProfessor || Number.isNaN(idProfessor)) {
      return res
        .status(400)
        .json({ error: "idProfessor obrigatório e numérico." });
    }
    try {
      await prisma.professor.delete({
        where: { idProfessor },
      });
      return res.status(204).end();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("DELETE /api/professores/professor error:", msg);
      return res.status(400).json({ error: msg });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}
