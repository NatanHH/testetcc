import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const payload: unknown = req.body;
  if (typeof payload !== "object" || payload === null)
    return res.status(400).json({ error: "Invalid body" });

  // Accept either { atividadeId, turmaId, alunoId } or { idAtividade, idTurma, idAluno }
  const body = payload as Record<string, unknown>;

  const parseNumber = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const atividadeIdRaw =
    body["atividadeId"] ?? body["idAtividade"] ?? body["id"];
  const turmaIdRaw = body["turmaId"] ?? body["idTurma"] ?? body["turma"];
  const alunoIdRaw = body["alunoId"] ?? body["idAluno"] ?? body["idAluno"];

  const atividadeIdNum = parseNumber(atividadeIdRaw);
  const turmaIdNum = parseNumber(turmaIdRaw);
  const alunoIdNum = parseNumber(alunoIdRaw);

  // Validação: atividadeId e turmaId são obrigatórios para aplicar uma atividade a uma turma.
  if (atividadeIdNum == null || turmaIdNum == null) {
    return res.status(400).json({
      error: "atividadeId e turmaId são obrigatórios",
    });
  }

  try {
    // Verificar se atividade existe
    const atividade = await prisma.atividade.findUnique({
      where: { idAtividade: atividadeIdNum },
    });

    if (!atividade) {
      return res.status(404).json({ error: "Atividade não encontrada" });
    }

    // Verificar se turma existe
    const turma = await prisma.turma.findUnique({
      where: { idTurma: turmaIdNum },
    });

    if (!turma) {
      return res.status(404).json({ error: "Turma não encontrada" });
    }

    // Se foi fornecido alunoId, opcionalmente validar sua existência
    if (alunoIdNum != null) {
      const aluno = await prisma.aluno.findUnique({
        where: { idAluno: alunoIdNum },
      });
      if (!aluno) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }
    }

    // Verificar se já foi aplicada nesta turma (usando o modelo correto)
    const jaAplicada = await prisma.atividadeTurma.findFirst({
      where: {
        idTurma: turmaIdNum,
        idAtividade: atividadeIdNum,
      },
    });

    if (jaAplicada) {
      return res.status(200).json({
        success: true,
        message: "Esta atividade já foi aplicada nesta turma",
        jaExistia: true,
      });
    }

    // Aplicar atividade na turma (usando o modelo correto do seu schema)
    const aplicacao = await prisma.atividadeTurma.create({
      data: {
        idTurma: turmaIdNum,
        idAtividade: atividadeIdNum,
        dataAplicacao: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Atividade aplicada com sucesso!",
      aplicacao: {
        id: aplicacao.idAtividadeTurma,
        atividade: atividade.titulo,
        turma: turma.nome,
        dataAplicacao: aplicacao.dataAplicacao,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Erro ao aplicar atividade:", msg);

    const rec = err as Record<string, unknown> | null;
    if (rec && typeof rec === "object") {
      const code = rec["code"];
      if (typeof code === "string" && code === "P2002") {
        return res.status(400).json({
          error:
            "Esta atividade já foi aplicada nesta turma (constraint única)",
        });
      }
    }

    return res.status(500).json({
      error: "Erro interno do servidor",
      details: msg,
    });
  }
}
