import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

/**
 * API para gerenciar uma atividade específica por ID
 * Rota: /api/atividade/[id] onde [id] é o ID da atividade
 * Suporta operações CRUD completas: GET, PUT/PATCH, DELETE
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Extrai o ID da atividade da URL e converte para número
  const { id } = req.query;
  const atividadeId = Number(id);

  // Valida se o ID é um número válido
  if (Number.isNaN(atividadeId))
    return res.status(400).json({ error: "ID inválido" });

  try {
    // GET: Busca uma atividade específica por ID
    if (req.method === "GET") {
      const atividade = await prisma.atividade.findUnique({
        where: { idAtividade: atividadeId },
        // Inclui dados relacionados: arquivos, alternativas e turmas vinculadas
        include: { arquivos: true, alternativas: true, turmas: true },
      });

      if (!atividade)
        return res.status(404).json({ error: "Atividade não encontrada" });
      return res.status(200).json(atividade);
    }

    // PUT/PATCH: Atualiza uma atividade existente
    if (req.method === "PUT" || req.method === "PATCH") {
      // trate o body como `unknown` e valide antes de usar
      const payload: unknown = req.body;
      if (typeof payload !== "object" || payload === null) {
        return res.status(400).json({ error: "Payload inválido" });
      }
      // extraia campos com validação/guards
      const { titulo, descricao, dataExpiracao } = payload as {
        titulo?: unknown;
        descricao?: unknown;
        dataExpiracao?: unknown;
      };

      if (typeof titulo !== "string") {
        return res.status(400).json({ error: "Campo 'titulo' obrigatório" });
      }
      const tituloStr = titulo;
      const descricaoStr =
        typeof descricao === "string" ? descricao : undefined;
      const dataExpiracaoStr =
        typeof dataExpiracao === "string" ? dataExpiracao : undefined;

      // Monta objeto com apenas os campos que foram enviados para atualização
      const updateData: Record<string, unknown> = {};
      if (titulo !== undefined) updateData.titulo = tituloStr;
      if (descricao !== undefined) updateData.descricao = descricaoStr;
      if (dataExpiracao !== undefined)
        updateData.dataExpiracao = dataExpiracaoStr;

      // Executa a atualização no banco
      const atividade = await prisma.atividade.update({
        where: { idAtividade: atividadeId },
        data: updateData,
        include: { alternativas: true, arquivos: true },
      });

      return res.status(200).json(atividade);
    }

    // DELETE: Remove uma atividade e todos os dados relacionados
    if (req.method === "DELETE") {
      // Remove alternativas relacionadas (por segurança, mesmo que haja cascade)
      await prisma.alternativa.deleteMany({
        where: { idAtividade: atividadeId },
      });
      // Remove arquivos relacionados
      await prisma.atividadeArquivo.deleteMany({ where: { atividadeId } });
      // Remove a atividade principal
      await prisma.atividade.delete({ where: { idAtividade: atividadeId } });

      return res.status(204).end(); // 204 = No Content (sucesso sem retorno)
    }

    // Método HTTP não suportado
    return res.status(405).json({ error: "Método não permitido" });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("Erro GET /api/atividade/[id]:", errMsg);
    return res.status(500).json({ error: errMsg || "Erro interno" });
  }
}
