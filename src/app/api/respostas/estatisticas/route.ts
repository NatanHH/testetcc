import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const alunoIdRaw = url.searchParams.get("alunoId");
  const atividadeIdRaw = url.searchParams.get("atividadeId");
  const turmaIdRaw = url.searchParams.get("turmaId");

  const alunoId = alunoIdRaw ? Number(alunoIdRaw) : NaN;
  const atividadeId = atividadeIdRaw ? Number(atividadeIdRaw) : undefined;
  const turmaId = turmaIdRaw ? Number(turmaIdRaw) : undefined;

  if (!Number.isInteger(alunoId)) {
    return NextResponse.json({ error: "alunoId required" }, { status: 400 });
  }

  try {
    // Adapter typing to avoid spreading `any` from prisma in source
    const p = prisma as unknown as {
      respostaAlunoAtividade: { count(args: unknown): Promise<number> };
      realizacaoPlugged: {
        count(args: unknown): Promise<number>;
        findMany(args: unknown): Promise<
          Array<{
            selectedValue: unknown;
            correctValue: unknown;
            notaObtida: number | null;
          }>
        >;
      };
    };

    const whereResposta: Record<string, unknown> = { idAluno: alunoId };
    if (atividadeId !== undefined) whereResposta.idAtividade = atividadeId;

    const totalRespostas = await p.respostaAlunoAtividade.count({
      where: whereResposta,
    });
    const corretasRespostas = await p.respostaAlunoAtividade.count({
      where: {
        ...whereResposta,
        OR: [{ notaObtida: { gt: 0 } }, { alternativa: { correta: true } }],
      },
    } as unknown);

    const wherePluggedBase: Record<string, unknown> = { idAluno: alunoId };
    if (atividadeId !== undefined) wherePluggedBase.idAtividade = atividadeId;
    if (turmaId !== undefined) wherePluggedBase.idTurma = turmaId;

    const totalPlugged = await p.realizacaoPlugged.count({
      where: wherePluggedBase,
    });
    const corretasByNota = await p.realizacaoPlugged.count({
      where: { ...wherePluggedBase, notaObtida: { gt: 0 } },
    });

    // Batch-read to compare selectedValue vs correctValue safely in JS
    const batchSize = 1000;
    let offset = 0;
    let corretasByMatch = 0;

    while (true) {
      const batch = await p.realizacaoPlugged.findMany({
        where: {
          ...wherePluggedBase,
          AND: [
            { OR: [{ notaObtida: { lte: 0 } }, { notaObtida: null }] },
            { selectedValue: { not: null } },
          ],
        },
        select: { selectedValue: true, correctValue: true, notaObtida: true },
        skip: offset,
        take: batchSize,
      });

      if (batch.length === 0) break;

      for (const item of batch) {
        if (item.notaObtida != null && Number(item.notaObtida) > 0) {
          corretasByMatch++;
          continue;
        }
        if (
          item.selectedValue != null &&
          item.correctValue != null &&
          String(item.selectedValue) === String(item.correctValue)
        ) {
          corretasByMatch++;
        }
      }

      offset += batch.length;
      if (batch.length < batchSize) break;
    }

    const corretasPlugged = Number(corretasByNota) + Number(corretasByMatch);
    const totalAttempts = Number(totalRespostas) + Number(totalPlugged);
    const totalCorrect = Number(corretasRespostas) + Number(corretasPlugged);

    return NextResponse.json({ totalAttempts, correct: totalCorrect });
  } catch (err: unknown) {
    let msg: string;
    if (err instanceof Error) msg = err.message;
    else if (err && typeof err === "object" && "message" in err)
      msg = String((err as { message?: unknown }).message);
    else msg = String(err);
    console.error("estatisticas error:", msg);
    const body =
      process.env.NODE_ENV === "production"
        ? { error: "internal" }
        : { error: msg };
    return NextResponse.json(body, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rawBody: unknown = await req.json().catch(() => undefined);
  if (rawBody === undefined) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // ajuste conforme seu modelo prisma
  return NextResponse.json({ ok: true });
}

// export default removed: GET/POST/OPTIONS nomeados atendem esta rota no app-router
