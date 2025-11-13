import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";
import type {
  AtividadeTurma,
  Atividade as PrismaAtividade,
  AtividadeArquivo,
  Turma,
  Professor,
} from "@prisma/client";

type AplicacaoWithIncludes = AtividadeTurma & {
  atividade: PrismaAtividade & { arquivos: AtividadeArquivo[] };
  turma: Turma | null;
  professor: Professor | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, senha } = req.body ?? {};
  if (typeof email !== "string" || typeof senha !== "string") {
    return res.status(400).json({ error: "email and senha required" });
  }

  try {
    const emailNorm = email.trim().toLowerCase();

    // DEBUG: log which email forms we're trying (no passwords)
    console.log("[loginaluno] trying login for", {
      emailRaw: email,
      emailNorm,
    });

    // try case-normalized lookup first
    let aluno = await prisma.aluno.findUnique({ where: { email: emailNorm } });
    if (!aluno) {
      console.log("[loginaluno] normalized lookup failed, trying fallbacks");
      // fallback: try case-sensitive/other lookups
      aluno =
        (await prisma.aluno.findFirst({ where: { email } })) ??
        (await prisma.aluno.findFirst({ where: { nome: email } }));
      console.log("[loginaluno] fallback result:", {
        found: !!aluno,
        id: aluno?.idAluno ?? null,
      });
    }

    if (!aluno) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }
    const stored = aluno.senha as string | null;
    // detect whether the stored value looks like a bcrypt hash (avoid relying on exceptions)
    const looksLikeBcryptHash =
      typeof stored === "string" && /^\$2[aby]\$/.test(stored);
    console.log(
      "[loginaluno] aluno found, id:",
      aluno.idAluno,
      "storedLooksLikeHash:",
      looksLikeBcryptHash
    );

    let passwordMatches = false;
    if (typeof stored === "string") {
      if (looksLikeBcryptHash) {
        try {
          passwordMatches = await bcrypt.compare(senha, stored);
          console.log("[loginaluno] bcrypt.compare result:", passwordMatches);
        } catch (e) {
          // if bcrypt throws for some unexpected reason, log and treat as non-match
          console.error("[loginaluno] bcrypt.compare threw:", e);
          passwordMatches = false;
        }
      } else {
        // stored doesn't look like a bcrypt hash — compare directly
        passwordMatches = senha === stored;
        console.log("[loginaluno] direct-compare result:", passwordMatches);
      }
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    // On successful login, also return the student's turmas and atividades applied
    // so the client can render them immediately after login.
    // Discover turma ids
    const turmaLinks = await prisma.turmaAluno.findMany({
      where: { idAluno: aluno.idAluno },
      include: { turma: true },
    });
    const turmaIds = turmaLinks.map((t) => t.idTurma);

    // Find applications (atividadeTurma) for these turmas (fallback to nested lookup)
    let aplicacoes: AplicacaoWithIncludes[] = [];
    if (turmaIds.length > 0) {
      aplicacoes = await prisma.atividadeTurma.findMany({
        where: { idTurma: { in: turmaIds } },
        include: {
          atividade: { include: { arquivos: true } },
          turma: true,
          professor: true,
        },
        orderBy: { dataAplicacao: "desc" },
      });
    } else {
      aplicacoes = await prisma.atividadeTurma.findMany({
        where: {
          turma: { alunos: { some: { idAluno: aluno.idAluno } } },
        },
        include: {
          atividade: { include: { arquivos: true } },
          turma: true,
          professor: true,
        },
        orderBy: { dataAplicacao: "desc" },
      });
    }

    // Filter aplicações to those applied by the turma's professor (same logic as listaratividades)
    const aplicFiltered = aplicacoes.filter((ap) => {
      if (!ap.turma) return false;
      const turmaProfessorId = ap.turma.professorId;
      const aplicadorId = ap.idProfessor ?? ap.professor?.idProfessor ?? null;
      if (aplicadorId === null || aplicadorId === undefined) return false;
      return turmaProfessorId === aplicadorId;
    });

    const atividades = aplicFiltered.map((ap) => {
      const at = ap.atividade;
      return {
        idAtividade: at.idAtividade,
        titulo: at.titulo,
        descricao: at.descricao ?? null,
        tipo: at.tipo,
        nota: at.nota ?? null,
        dataAplicacao: ap.dataAplicacao ? ap.dataAplicacao.toISOString() : null,
        turma: ap.turma
          ? { idTurma: ap.turma.idTurma, nome: ap.turma.nome }
          : null,
        arquivos: (at.arquivos || []).map((f: AtividadeArquivo) => ({
          idArquivo: f.idArquivo,
          url: f.url,
          tipoArquivo: f.tipoArquivo ?? null,
          nomeArquivo: null,
        })),
      };
    });

    const turmas = turmaLinks.map((t) => ({
      idTurma: t.idTurma,
      nome: t.turma?.nome ?? "",
    }));

    // DEBUG: log counts before returning to help production debugging
    try {
      console.debug(
        `[loginaluno] idAluno=${aluno.idAluno} turmas=${turmas.length} atividades=${atividades.length}`
      );
    } catch {
      /* ignore logging errors */
    }

    return res.status(200).json({
      success: true,
      idAluno: aluno.idAluno,
      nome: aluno.nome,
      email: aluno.email,
      turmas,
      atividades,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("loginaluno error:", msg);
    return res.status(500).json({ error: msg });
  }
}
