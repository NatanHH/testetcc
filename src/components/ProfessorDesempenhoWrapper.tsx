"use client";
import React, { useState } from "react";
import DesempenhoAlunos from "./DesempenhoAlunos";

export default function ProfessorDesempenhoWrapper({
  turmaId,
  atividadeId,
}: {
  turmaId?: number | null;
  atividadeId?: number | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          background: "#2563eb",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        {open ? "Fechar Desempenho" : "Desempenho"}
      </button>

      {open && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <DesempenhoAlunos
            dados={[]}
            turmaId={turmaId ?? null}
            atividadeId={atividadeId ?? null}
          />
        </div>
      )}
    </div>
  );
}
