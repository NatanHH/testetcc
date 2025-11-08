import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import type {
  AtividadeTurma,
  Atividade as PrismaAtividade,
  AtividadeArquivo,
  Turma,
  Professor,
} from "@prisma/client";

// Narrowed shape for atividadeTurma when `include` is used in queries below.
type AplicacaoWithIncludes = AtividadeTurma & {
  atividade: PrismaAtividade & { arquivos: AtividadeArquivo[] };
  turma: Turma | null;
  professor: Professor | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const alunoIdRaw = req.query.alunoId;
    const alunoId = alunoIdRaw !== undefined ? Number(String(alunoIdRaw)) : NaN;

    // If alunoId provided and valid, return activities applied to the aluno's turma(s)
    // Supports optional query params:
    // - turmaId: numeric (when provided, require that aluno belongs to that turma)
    // - page, perPage: pagination
    if (!Number.isNaN(alunoId)) {
      const turmaIdRaw = req.query.turmaId;
      const turmaId =
        turmaIdRaw !== undefined ? Number(String(turmaIdRaw)) : NaN;
      const pageRaw = req.query.page;
      const perPageRaw = req.query.perPage;
      const page = Number.isFinite(Number(pageRaw))
        ? Math.max(1, Number(pageRaw))
        : 1;
      const perPage = Number.isFinite(Number(perPageRaw))
        ? Math.max(1, Math.min(200, Number(perPageRaw)))
        : 50;

      // discover turma ids for the aluno
      const turmaLinks = await prisma.turmaAluno.findMany({
        where: { idAluno: alunoId },
        select: { idTurma: true },
      });
      const turmaIds = turmaLinks.map((t) => t.idTurma);

      // If caller requested a specific turmaId, ensure the aluno is member of that turma
      if (!Number.isNaN(turmaId)) {
        if (!turmaIds.includes(turmaId)) {
          return res
            .status(403)
            .json({ error: "Aluno não pertence à turma solicitada" });
        }
      }

      // build where clause: either the requested turmaId or all turmaIds the aluno belongs to
      const whereClause = !Number.isNaN(turmaId)
        ? { idTurma: turmaId }
        : { idTurma: { in: turmaIds.length ? turmaIds : [-1] } };

      // fetch total count for pagination
      const total = await prisma.atividadeTurma.count({ where: whereClause });

      // fetch atividadeTurma rows with pagination
      const aplicacoes = await prisma.atividadeTurma.findMany({
        where: whereClause,
        include: {
          atividade: { include: { arquivos: true } },
          turma: true,
          professor: true,
        },
        orderBy: { dataAplicacao: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      });

      // map atividadeTurma rows into grouped atividades keyed by atividade id to
      // deduplicate when the same atividade is applied to multiple turmas
      const grouped = new Map<number, any>();
      for (const ap of aplicacoes) {
        const at = ap.atividade;
        if (!at) continue;
        const existing = grouped.get(at.idAtividade);
        const resumo = {
          idAtividade: at.idAtividade,
          titulo: at.titulo,
          descricao: at.descricao ?? null,
          tipo: at.tipo,
          nota: at.nota ?? null,
          dataAplicacao: ap.dataAplicacao
            ? ap.dataAplicacao.toISOString()
            : null,
          turmas: ap.turma
            ? [{ idTurma: ap.turma.idTurma, nome: ap.turma.nome }]
            : [],
          arquivos: (at.arquivos || []).map((f: AtividadeArquivo) => ({
            idArquivo: f.idArquivo,
            url: f.url,
            tipoArquivo: f.tipoArquivo ?? null,
            nomeArquivo: null,
          })),
        };
        if (!existing) grouped.set(at.idAtividade, resumo);
        else {
          // merge turma info
          const existingTurmas = existing.turmas as {
            idTurma: number;
            nome: string;
          }[];
          const newTurma = ap.turma
            ? { idTurma: ap.turma.idTurma, nome: ap.turma.nome }
            : null;
          if (
            newTurma &&
            !existingTurmas.find((t) => t.idTurma === newTurma.idTurma)
          )
            existingTurmas.push(newTurma);
          // keep earliest dataAplicacao as primary if existing lacks it
          if (!existing.dataAplicacao && resumo.dataAplicacao)
            existing.dataAplicacao = resumo.dataAplicacao;
        }
      }

      const resultados = Array.from(grouped.values()).map((r) => ({
        idAtividade: r.idAtividade,
        titulo: r.titulo,
        descricao: r.descricao,
        tipo: r.tipo,
        nota: r.nota,
        dataAplicacao: r.dataAplicacao,
        turma: r.turmas && r.turmas.length ? r.turmas[0] : null,
        arquivos: r.arquivos,
      }));

      try {
        console.debug(
          `[listaratividades] alunoId=${alunoId} turmaIds=${JSON.stringify(
            turmaIds
          )} aplicacoes=${resultados.length} total=${total}`
        );
      } catch {}

      return res
        .status(200)
        .json({ atividades: resultados, meta: { page, perPage, total } });
    }

    // fallback: return all atividades (legacy behavior)
    const atividades = await prisma.atividade.findMany({
      include: { arquivos: true },
    });
    const mapped = atividades.map((at) => ({
      idAtividade: at.idAtividade,
      titulo: at.titulo,
      descricao: at.descricao ?? null,
      tipo: at.tipo,
      nota: at.nota ?? null,
      dataAplicacao: null,
      turma: null,
      arquivos: (at.arquivos || []).map((f: AtividadeArquivo) => ({
        idArquivo: f.idArquivo,
        url: f.url,
        tipoArquivo: f.tipoArquivo ?? null,
        nomeArquivo: null,
      })),
    }));

    return res.status(200).json(mapped);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/listaratividades error:", msg);
    return res.status(500).json({ error: msg || "Erro interno" });
  }
}
