"use client";
import React, { useState } from "react";

type UploadResult = {
  uploaded: number;
  arquivos?: {
    idArquivo: number;
    url: string;
    tipoArquivo?: string;
    atividadeId?: number;
  }[];
  errors?: { filename: string; message: string }[];
};

export default function UploadArquivos({
  atividadeId,
}: {
  atividadeId: number;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setFiles(Array.from(e.target.files));
  }

  async function handleUpload() {
    if (!atividadeId) return alert("atividadeId necessário");
    if (files.length === 0) return alert("Selecione arquivos");

    const fd = new FormData();
    files.forEach((f) => fd.append("arquivos", f));
    fd.append("atividadeId", String(atividadeId));

    setLoading(true);
    try {
      const res = await fetch("/api/upload-arquivos-atividade", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as unknown;
      // normalize/set result only when shape parece correto
      if (data && typeof data === "object") {
        setResult(data as UploadResult);
      } else {
        setResult(null);
      }
      if (!res.ok) {
        const errMsg =
          data && typeof data === "object"
            ? String(
                (data as Record<string, unknown>).error ??
                  (data as Record<string, unknown>).message ??
                  `status ${res.status}`
              )
            : `Erro no upload (status ${res.status})`;
        alert(errMsg);
      } else {
        const uploadedCount =
          data &&
          typeof data === "object" &&
          "uploaded" in (data as Record<string, unknown>)
            ? Number((data as Record<string, unknown>).uploaded)
            : null;
        alert(
          uploadedCount != null
            ? `Upload finalizado: ${uploadedCount} arquivos`
            : "Upload finalizado."
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro upload cliente:", msg);
      alert("Erro de rede no upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <input
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleChange}
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        style={{ marginLeft: 8 }}
      >
        {loading ? "Enviando..." : "Enviar Arquivos"}
      </button>

      {result && (
        <div style={{ marginTop: 12, maxWidth: 700 }}>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#111",
              color: "#eee",
              padding: 8,
              borderRadius: 6,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
