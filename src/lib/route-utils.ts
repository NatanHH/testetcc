export async function resolveParams(
  context: unknown
): Promise<Record<string, unknown> | undefined> {
  // context pode ser um object ou uma Promise
  const ctx = await Promise.resolve(context);
  if (ctx && typeof ctx === "object" && "params" in ctx) {
    const params = (ctx as Record<string, unknown>)["params"];
    if (params && typeof params === "object")
      return params as Record<string, unknown>;
  }
  return undefined;
}

type ReqLike = unknown;
type ResLike = {
  statusCode?: number;
  end: (chunk?: unknown) => void;
};

export default async function handler(req: ReqLike, res: ResLike) {
  // redirecionar para a implementação existente ou responder 405
  res.statusCode = 405;
  res.end("Method not allowed");
}
