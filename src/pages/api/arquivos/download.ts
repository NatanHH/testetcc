import { NextApiRequest, NextApiResponse } from "next";

export function downloadAttachmentOpen(attachmentId: number) {
  // se a autenticação utilizar cookies/session, abrir a url basta
  const url = `/api/attachments/${attachmentId}`;
  window.open(url, "_blank");
}

export async function downloadAttachmentFetch(
  attachmentId: number,
  professorId?: number
) {
  const headers: Record<string, string> = {};
  if (professorId) headers["x-professor-id"] = String(professorId); // apenas para testes
  const res = await fetch(`/api/attachments/${attachmentId}`, { headers });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    alert(json.error || "Erro ao baixar arquivo");
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  let filename = `anexo-${attachmentId}`;
  const m = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/);
  if (m) filename = decodeURIComponent(m[1]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// supondo que já exista uma função named `downloadHandler(req, res)`
// apenas adicione um default export compatível com Next.js API:
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // se já houver uma função pronta em globalThis:
    const g = globalThis as Record<string, unknown>;
    const maybeHandler = g.downloadHandler;
    if (typeof maybeHandler === "function") {
      const handlerFn = maybeHandler as (
        req: NextApiRequest,
        res: NextApiResponse
      ) => Promise<void> | void;
      return await handlerFn(req, res);
    }
    // ou reproduza a lógica diretamente aqui
    res.status(500).send("handler not implemented");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("download api error:", msg);
    res.status(500).json({ error: "internal" });
  }
}
