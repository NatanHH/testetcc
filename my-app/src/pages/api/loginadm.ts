import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import prisma from "../../lib/prisma";

type Locals = { ok?: boolean; error?: string; userId?: number };

function pickModel(client: unknown): Record<string, unknown> | null {
  if (!client || typeof client !== "object") return null;
  const c = client as Record<string, unknown>;
  const candidates = [
    "adm",
    "Admin",
    "Adm",
    "admin",
    "Administrador",
    "administrador",
    "user",
    "Usuario",
    "adminUsuario",
  ];
  for (const key of candidates) {
    const maybe = c[key];
    // prisma model entries can appear as objects or callable functions depending on client internals
    if (maybe && (typeof maybe === "object" || typeof maybe === "function"))
      return maybe as Record<string, unknown>;
  }
  return null;
}

async function callFindUnique(
  model: Record<string, unknown> | null,
  opts: unknown
): Promise<Record<string, unknown> | null> {
  if (!model) return null;
  const fn = model["findUnique"];
  if (typeof fn === "function") {
    return (fn as (...a: unknown[]) => Promise<unknown>)(
      opts
    ) as Promise<Record<string, unknown> | null>;
  }
  return null;
}

async function callFindFirst(
  model: Record<string, unknown> | null,
  opts: unknown
): Promise<Record<string, unknown> | null> {
  if (!model) return null;
  const fn = model["findFirst"];
  if (typeof fn === "function") {
    return (fn as (...a: unknown[]) => Promise<unknown>)(
      opts
    ) as Promise<Record<string, unknown> | null>;
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Locals>
) {
  console.log("[loginadm] incoming", {
    method: req.method,
    bodySample: req.body && Object.keys(req.body).slice(0, 3),
  });
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { email, senha } = req.body ?? {};
  if (typeof email !== "string" || typeof senha !== "string") {
    console.log("[loginadm] bad payload", {
      emailType: typeof email,
      senhaType: typeof senha,
    });
    return res.status(400).json({ error: "email and senha required" });
  }

  try {
    console.log("[loginadm] normalizing input", { emailRaw: email });
    const emailNorm = email.trim().toLowerCase();

    const Model = pickModel(prisma);
    if (!Model) {
      console.error(
        "[loginadm] prisma model for admin not found. Available keys:",
        Object.keys(prisma as unknown as Record<string, unknown>).slice(0, 40)
      );
      return res.status(500).json({ error: "server_error" });
    }

    console.log(
      "[loginadm] using model lookup, searching by email:",
      emailNorm
    );

    let user: Record<string, unknown> | null =
      (await callFindUnique(Model, { where: { email: emailNorm } })) ??
      (await callFindFirst(Model, { where: { email: emailNorm } })) ??
      (await callFindFirst(Model, { where: { login: emailNorm } })) ??
      (await callFindFirst(Model, { where: { username: emailNorm } }));

    if (!user) {
      console.log(
        "[loginadm] user not found (trying case-insensitive fallback)"
      );
      const fallback =
        (await callFindFirst(Model, { where: { email } })) ??
        (await callFindFirst(Model, { where: { login: email } }));
      if (!fallback) {
        console.log("[loginadm] still not found for", email);
        return res.status(401).json({ error: "invalid_credentials" });
      }
      user = fallback;
    }

    const userId =
      Number(
        user["id"] ??
          user["ID"] ??
          user["idAdmin"] ??
          user["adminId"] ??
          user["idAdm"] ??
          user["idAdministrador"]
      ) || undefined;
    console.log("[loginadm] user found, id:", userId ?? "unknown");

    const stored =
      (user["senha"] as unknown) ??
      (user["password"] as unknown) ??
      (user["hash"] as unknown) ??
      null;
    console.log("[loginadm] stored password field type:", typeof stored);

    let passwordMatches = false;
    if (typeof stored === "string") {
      try {
        passwordMatches = await bcrypt.compare(senha, stored);
        console.log("[loginadm] bcrypt.compare result:", passwordMatches);
      } catch (e: unknown) {
        console.log(
          "[loginadm] bcrypt compare failed, trying direct compare",
          e instanceof Error ? e.message : String(e)
        );
        passwordMatches = senha === stored;
      }
    } else {
      passwordMatches = senha === (stored as string | null);
    }

    if (!passwordMatches) {
      console.log(
        "[loginadm] password mismatch for user id:",
        userId ?? "unknown"
      );
      return res.status(401).json({ error: "invalid_credentials" });
    }

    console.log("[loginadm] login success id:", userId ?? "unknown");
    return res.status(200).json({ ok: true, userId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[loginadm] unexpected error:", msg);
    return res.status(500).json({ error: "server_error" });
  }
}
