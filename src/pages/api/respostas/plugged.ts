import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { withRateLimit } from "../../../lib/rate-limit";

const prisma = new PrismaClient();

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function buildInstanceFromSeed(seed: number) {
  const rand = mulberry32(seed);
  const cards = [8, 4, 2, 1];
  const bits = cards.map(() => (rand() > 0.5 ? 1 : 0));
  const decimal = bits.reduce<number>((acc, b, i) => acc + b * cards[i], 0);

  const opts = new Set<number>();
  opts.add(decimal);
  while (opts.size < 4) {
    const delta = Math.floor((rand() - 0.5) * 6);
    opts.add(Math.max(0, decimal + delta));
  }
  const alternatives = Array.from(opts).map((v, i) => ({
    id: `opt${i}`,
    value: v,
    label: String(v),
  }));
  for (let i = alternatives.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [alternatives[i], alternatives[j]] = [alternatives[j], alternatives[i]];
  }

  return { cards, bits, decimal, alternatives };
}

// ✅ OTIMIZAÇÃO: Handler com rate limiting (máx 30 tentativas/minuto)
async function pluggedHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const body = req.body ?? {};
    const idAtividade = Number(body.idAtividade) || 0;
    const idAluno = body.idAluno ? Number(body.idAluno) : null;
    const idTurma = body.idTurma ? Number(body.idTurma) : null;
    const seed = Number(body.seed);
    const selectedValue =
      body.selectedValue !== undefined ? Number(body.selectedValue) : null;

    // ✅ VALIDAÇÃO: Payload obrigatório
    if (!idAtividade || Number.isNaN(seed) || selectedValue === null) {
      return res.status(400).json({ error: "payload inválido" });
    }

    // ✅ VALIDAÇÃO: Verificar se aluno pertence à turma (se fornecidos)
    if (idAluno && idTurma) {
      const alunoNaTurma = await prisma.turmaAluno.findUnique({
        where: {
          idTurma_idAluno: { idTurma, idAluno },
        },
      });

      if (!alunoNaTurma) {
        return res.status(403).json({
          error: "Você não tem permissão para acessar esta atividade",
        });
      }
    }

    // ✅ VALIDAÇÃO: Verificar se atividade existe e está ativa
    const atividade = await prisma.atividade.findUnique({
      where: { idAtividade },
      select: { idAtividade: true, tipo: true },
    });

    if (!atividade || atividade.tipo !== "PLUGGED") {
      return res.status(404).json({
        error: "Atividade não encontrada ou não é do tipo PLUGGED",
      });
    }

    // recalcula a partir do seed para saber qual é o correto
    const instance = buildInstanceFromSeed(seed);
    const correctValue = instance.decimal;
    const correta = selectedValue === correctValue;
    const notaObtida = correta ? 10 : 0;

    // ✅ VALIDAÇÃO: Professor pode testar mas não salva no banco
    // Se não tem idAluno, é modo teste (professor testando)
    if (!idAluno) {
      return res.status(200).json({
        ok: true,
        id: null,
        correta,
        correctValue,
        notaObtida,
        testMode: true,
        message: "Modo teste - resposta não foi salva",
      });
    }

    // grava apenas dados essenciais (somente para alunos)
    const saved = await prisma.realizacaoPlugged.create({
      data: {
        idAtividade,
        idAluno,
        idTurma,
        seed,
        correctValue,
        selectedValue,
        notaObtida,
      },
    });

    return res
      .status(200)
      .json({ ok: true, id: saved.id, correta, correctValue, notaObtida });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("respostas/plugged error:", msg);
    return res.status(500).json({ error: msg || "Erro interno" });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

// ✅ OTIMIZAÇÃO: Export com rate limiting (30 req/min)
export default withRateLimit(pluggedHandler, {
  windowMs: 60000,
  maxRequests: 30,
});
