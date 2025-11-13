import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import type { Prisma, TipoAtividade } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const atividades = await prisma.atividade.findMany({
        include: {
          alternativas: true,
          arquivos: true,
        },
        orderBy: { idAtividade: "desc" },
      });
      return res.status(200).json(atividades);
    }

    if (req.method === "POST") {
      const { titulo, descricao, tipo, nota, script, linguagem, alternativas } =
        req.body;

      // sanitize / validate inputs
      const tituloVal = typeof titulo === "string" ? titulo.trim() : "";
      if (!tituloVal)
        return res.status(400).json({ error: "titulo é obrigatório" });

      const allowedTipos = ["PLUGGED", "UNPLUGGED"];
      const tipoStr = typeof tipo === "string" ? tipo.trim().toUpperCase() : "";
      if (!allowedTipos.includes(tipoStr))
        return res.status(400).json({
          error: `tipo inválido. Valores permitidos: ${allowedTipos.join(
            ", "
          )}`,
        });

      // validate nota is provided and is a number (AtividadeCreateInput requires a number)
      const notaNum = Number(nota);
      if (nota === undefined || nota === null || Number.isNaN(notaNum))
        return res
          .status(400)
          .json({ error: "nota é obrigatória e deve ser um número" });

      const data: Prisma.AtividadeCreateInput = {
        titulo: tituloVal,
        descricao:
          typeof descricao === "string" && descricao.trim().length > 0
            ? descricao.trim()
            : null,
        tipo: tipoStr as TipoAtividade,
        script:
          typeof script === "string" && script.trim().length > 0
            ? script.trim()
            : null,
        linguagem:
          typeof linguagem === "string" && linguagem.trim().length > 0
            ? linguagem.trim()
            : null,
        nota: notaNum,
        ...(Array.isArray(alternativas) && alternativas.length > 0
          ? {
              alternativas: {
                create: alternativas.map((a: unknown) => {
                  const rec = a as Record<string, unknown>;
                  const texto =
                    typeof rec.texto === "string"
                      ? rec.texto
                      : typeof a === "string"
                      ? a
                      : String(rec.texto ?? "");
                  const correta = !!rec.correta;
                  return { texto, correta };
                }),
              },
            }
          : {}),
      };

      const created = await prisma.atividade.create({ data });
      return res.status(201).json(created);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método não permitido" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("atividades/index error:", msg);
    return res.status(500).json({ error: msg || "Erro interno" });
  }
}
