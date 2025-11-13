import React from "react";

type Arquivo = {
  idArquivo?: number;
  url: string;
  tipoArquivo?: string;
};

type Activity = {
  idAtividade: number;
  titulo: string;
  descricao?: string;
  tipo?: string; // "PLUGGED" | "UNPLUGGED"
  nota?: number;
  arquivos?: Arquivo[];
};

export default function ActivityItem({
  atividade,
  onEdit,
  onDelete,
}: {
  atividade: Activity;
  onEdit?: (a: Activity) => void;
  onDelete?: (id: number) => void;
}) {
  const arquivos = atividade.arquivos ?? [];

  function openUrl(url: string) {
    try {
      const finalUrl = url.startsWith("http")
        ? url
        : `${window.location.origin}${url}`;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro abrindo arquivo:", msg);
      alert("Não foi possível abrir o arquivo.");
    }
  }

  return (
    <div
      style={{
        marginBottom: 12,
        padding: 12,
        borderRadius: 6,
        background: "#2b1544",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <strong style={{ color: "#fff" }}>{atividade.titulo}</strong>
          <div style={{ color: "#ddd", marginTop: 6 }}>
            {atividade.descricao}
          </div>
          <div style={{ color: "#ccc", marginTop: 6 }}>
            Tipo: {atividade.tipo} — Nota: {atividade.nota}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {onEdit && (
            <button
              onClick={() => onEdit(atividade)}
              style={{ padding: "6px 10px" }}
            >
              Editar
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(atividade.idAtividade)}
              style={{
                padding: "6px 10px",
                background: "#b71c1c",
                color: "#fff",
              }}
            >
              Excluir
            </button>
          )}
        </div>
      </div>

      {/* Se for UNPLUGGED e houver arquivos, mostra botões para abrir */}
      {atividade.tipo === "UNPLUGGED" && arquivos.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <strong style={{ color: "#fff" }}>Anexos:</strong>
          <div
            style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}
          >
            {/* botão para abrir cada arquivo */}
            {arquivos.map((f, i) => (
              <button
                key={f.idArquivo ?? `${i}`}
                onClick={() => openUrl(f.url)}
                style={{
                  padding: "6px 10px",
                  background: "#4caf50",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                }}
                title={f.url}
              >
                Abrir anexo {i + 1}
              </button>
            ))}
            {/* botão alternativo: abrir todos em abas (opcional) */}
            <button
              onClick={() => arquivos.forEach((f) => openUrl(f.url))}
              style={{
                padding: "6px 10px",
                background: "#2196f3",
                color: "#fff",
                border: "none",
                borderRadius: 4,
              }}
              title="Abrir todos os anexos em novas abas"
            >
              Abrir todos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
