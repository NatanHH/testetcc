"use client";
import React, { JSX, useEffect, useState } from "react";

type Student = { id: number; nome: string; email?: string };
type Stats = { totalAttempts: number; correct: number };

type AlunoDesempenho = {
  alunoId: number;
  nome: string;
  nota?: number | null;
};

type Props = {
  dados: AlunoDesempenho[];
  onClose?: () => void;
  turmaId?: number | null;
  atividadeId?: number | null;
  studentsEndpoint?: string | null;
  statsEndpointBase?: string | null;
};

export default function DesempenhoAlunos({
  dados: _dados,
  onClose: _onClose,
  turmaId,
  atividadeId,
  studentsEndpoint,
  statsEndpointBase,
}: Props): JSX.Element {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!turmaId) return;
    const url = studentsEndpoint ?? `/api/turmas/${turmaId}/alunos`;
    setLoadingStudents(true);
    setError(null);
    void fetch(url)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.text().catch(() => null);
          throw new Error(
            `HTTP ${r.status} ${r.statusText} - ${url} - ${body ?? ""}`
          );
        }
        return r.json();
      })
      .then((j) => {
        // normalize incoming shapes (ex.: { idAluno, nome, email } ou { id, nome, email })
        const raw = Array.isArray(j) ? j : j?.alunos ?? [];
        const normalized = (raw as unknown[])
          .map((x) => {
            const rec = x as Record<string, unknown>;
            const alunoObj = (rec.aluno ?? {}) as Record<string, unknown>;
            const id = Number(
              rec.id ??
                rec.idAluno ??
                rec.id_aluno ??
                rec.alunoId ??
                alunoObj.id
            );
            const nome = String(rec.nome ?? rec.name ?? alunoObj.nome ?? "");
            const email = String(rec.email ?? rec.mail ?? alunoObj.email ?? "");
            return { id, nome, email };
          })
          .filter((s) => !Number.isNaN(s.id));
        setStudents(normalized);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("failed to load students:", msg);
        setError(`Erro ao carregar lista de alunos. (${msg})`);
        setStudents([]);
      })
      .finally(() => setLoadingStudents(false));
  }, [turmaId, studentsEndpoint]);

  async function loadStatsFor(alunoId: number) {
    setSelectedId(alunoId);
    setLoadingStats(true);
    setStats(null);
    setError(null);
    const base = statsEndpointBase ?? "/api/respostas/estatisticas";
    // monta query com alunoId e atividadeId (se houver)
    const q = new URL(base, location.origin);
    q.searchParams.set("alunoId", String(alunoId));
    if (atividadeId != null)
      q.searchParams.set("atividadeId", String(atividadeId));
    if (turmaId != null) q.searchParams.set("turmaId", String(turmaId)); // <- important for plugged
    try {
      const r = await fetch(q.toString());
      if (!r.ok) {
        const body = await r.text().catch(() => null);
        throw new Error(body ?? `HTTP ${r.status}`);
      }
      const j = await r.json();
      // espera { totalAttempts, correct } ou shape similar
      setStats({
        totalAttempts: Number(j.totalAttempts ?? j.total ?? 0),
        correct: Number(j.correct ?? j.correctCount ?? 0),
      });
    } catch (e) {
      console.error("failed to load stats", e);
      setError("Erro ao carregar estatísticas do aluno.");
    } finally {
      setLoadingStats(false);
    }
  }

  if (!turmaId) {
    return (
      <div>Informe turmaId ao componente para ver o desempenho dos alunos.</div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h3>Desempenho — Turma {turmaId}</h3>

      {loadingStudents && <div>Carregando alunos...</div>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {!loadingStudents && students && students.length === 0 && (
        <div>Nenhum aluno encontrado nesta turma.</div>
      )}

      {!loadingStudents && students && students.length > 0 && (
        <div style={{ display: "flex", gap: 20 }}>
          <ul style={{ flex: "0 0 320px", padding: 0 }}>
            {students.map((s) => (
              <li
                key={s.id}
                style={{
                  listStyle: "none",
                  padding: 8,
                  border:
                    selectedId === s.id
                      ? "2px solid #3b82f6"
                      : "1px solid #ddd",
                  borderRadius: 6,
                  marginBottom: 8,
                  cursor: "pointer",
                }}
                onClick={() => void loadStatsFor(s.id)}
              >
                <div style={{ fontWeight: 600 }}>{s.nome}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {s.email ?? "—"}
                </div>
              </li>
            ))}
          </ul>

          <div style={{ flex: 1 }}>
            {!selectedId && <div>Escolha um aluno para ver o desempenho.</div>}

            {loadingStats && <div>Carregando estatísticas...</div>}

            {stats && !loadingStats && (
              <div>
                <h4>Estatísticas</h4>
                <p>
                  Total de tentativas: <strong>{stats.totalAttempts}</strong>
                </p>
                <p>
                  Total corretas: <strong>{stats.correct}</strong>
                </p>
                <p>
                  Percentual:{" "}
                  <strong>
                    {stats.totalAttempts > 0
                      ? `${Math.round(
                          (stats.correct / stats.totalAttempts) * 100
                        )}%`
                      : "—"}
                  </strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
