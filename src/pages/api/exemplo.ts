import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma"; // ajuste o caminho relativo conforme necessário

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Acessa o model "user" de forma segura sem usar `any`.
    // Se o model "user" não existir no schema, tenta um fallback comum "aluno".
    const dynamicPrisma = prisma as unknown as Record<string, unknown>;

    const tryFetch = async (modelName: string): Promise<unknown[] | null> => {
      const maybe = dynamicPrisma[modelName];
      if (
        maybe &&
        typeof maybe === "object" &&
        "findMany" in maybe &&
        typeof (maybe as Record<string, unknown>)["findMany"] === "function"
      ) {
        return await (
          maybe as { findMany: () => Promise<unknown[]> }
        ).findMany();
      }
      return null;
    };

    const usersFromUser = await tryFetch("user");
    if (usersFromUser !== null) return res.status(200).json(usersFromUser);

    const usersFromAluno = await tryFetch("aluno");
    if (usersFromAluno !== null) return res.status(200).json(usersFromAluno);

    return res.status(500).json({ error: 'Prisma model "user" not available' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("exemplo error:", msg);
    return res.status(500).json({ error: msg });
  }
}
