import type { NextApiRequest, NextApiResponse } from "next";
// Ajuste o caminho para sua instância do prisma se for diferente:
import prisma from "../../lib/prisma";

/**
 * GET /api/aluno/:id/atividades
 * Retorna todas as atividades aplicadas às turmas do aluno (sem duplicatas),
 * incluindo metadados da atividade e anexos (atividade.arquivos).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  const idAluno = Number(id);
  if (!idAluno) return res.status(400).json({ error: "idAluno inválido" });

  try {
    // 1) pegar turmas do aluno
    const turmasAluno = await prisma.turmaAluno.findMany({
      where: { idAluno },
      select: { idTurma: true },
    });
    const turmaIds = turmasAluno.map((t) => t.idTurma);
    if (turmaIds.length === 0) {
      return res.status(200).json({ atividades: [] });
    }

    // 2) buscar aplicações (AtividadeTurma) para essas turmas, incluindo a atividade e anexos
    const aplicacoes = await prisma.atividadeTurma.findMany({
      where: { idTurma: { in: turmaIds } },
      include: {
        atividade: {
          include: {
            arquivos: true, // traz os arquivos (AtividadeArquivo)
          },
        },
        turma: true,
      },
      orderBy: { dataAplicacao: "desc" },
    });

    // 3) mapear para lista única de atividades (evitar duplicados caso mesma atividade aplicada em várias turmas)
    const mapAtividades = new Map<number, any>();
    for (const aTurma of aplicacoes) {
      const atividade = aTurma.atividade;
      if (!atividade) continue;
      const key = atividade.idAtividade;
      // manter a primeira ocorrência ou mesclar se quiser
      if (!mapAtividades.has(key)) {
        mapAtividades.set(key, {
          idAtividade: atividade.idAtividade,
          titulo: atividade.titulo,
          descricao: atividade.descricao,
          tipo: atividade.tipo,
          nota: atividade.nota,
          arquivos: atividade.arquivos || [],
          aplicacoes: [
            {
              idAtividadeTurma: aTurma.idAtividadeTurma,
              idTurma: aTurma.idTurma,
              dataAplicacao: aTurma.dataAplicacao,
            },
          ],
        });
      } else {
        // se já existe, acumula a aplicacao (opcional)
        const existing = mapAtividades.get(key);
        existing.aplicacoes.push({
          idAtividadeTurma: aTurma.idAtividadeTurma,
          idTurma: aTurma.idTurma,
          dataAplicacao: aTurma.dataAplicacao,
        });
      }
    }

    const atividades = Array.from(mapAtividades.values());

    return res.status(200).json({ atividades });
  } catch (err) {
    console.error("Erro ao buscar atividades do aluno:", err);
    return res.status(500).json({ error: "Erro ao listar atividades" });
  }
}
