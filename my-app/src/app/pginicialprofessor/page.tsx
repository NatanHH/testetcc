"use client";
import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import DesempenhoAlunos from "../../components/DesempenhoAlunos";
import Footer from "../../components/Footer";

// Expose typed helper on window for debug/dev usage without using `any`.
declare global {
  interface Window {
    openAlunoDetalhes?: (
      alunoObj?: {
        idAluno?: number;
        nome?: string | null;
        email?: string | null;
      } | null,
      idFallback?: number | null
    ) => Promise<void>;
  }
}

// Load the MCQ component dynamically (client component)
type PluggedContagemMCQProps = {
  fetchEndpoint: string;
  saveEndpoint: string;
  alunoId?: number | null;
  initialLoad?: boolean;
  atividadeId?: number;
  turmaId?: number | null;
  isProfessor?: boolean;
};
// Use the props generic so Next's dynamic loader signature aligns with the component props
const PluggedContagemMCQ = dynamic<PluggedContagemMCQProps>(
  () =>
    import("../../components/PluggedContagemMCQ").then((mod) => mod.default),
  { ssr: false }
);

// Tipos (mantidos)
type Arquivo = { idArquivo?: number; url: string; tipoArquivo?: string };
type Turma = {
  idTurma: number;
  nome: string;
  alunos: { aluno: { idAluno: number; nome: string; email: string } }[];
};
type Atividade = {
  idAtividade: number;
  titulo: string;
  descricao?: string;
  tipo?: string;
  nota?: number;
  isStatic?: boolean;
  source?: string;
  arquivos?: Arquivo[];
};

type RespostaResumo = {
  idResposta: number;
  idAluno: number;
  aluno?: { idAluno: number; nome: string; email: string } | null;
  respostaTexto?: string | null;
  dataAplicacao?: string | null;
  notaObtida?: number | null;
  feedback?: string | null;
};

export default function PageProfessor() {
  // --- estados existentes (preservados) ---
  const [professorId, setProfessorId] = useState<number | null>(null);
  const [professorNome, setProfessorNome] = useState<string>("");
  const [professorEmail, setProfessorEmail] = useState<string>("");

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);

  // New: expanded activity id - shows details inline where the activity is listed
  const [expandedAtividadeId, setExpandedAtividadeId] = useState<number | null>(
    null
  );

  // keep atividadeDetalhe for compatibility with modals that reference it
  const [atividadeDetalhe, setAtividadeDetalhe] = useState<Atividade | null>(
    null
  );
  // atividade selecionada dentro do modal de desempenho (padrão = a atividade clicada)
  const [modalSelectedAtividadeId, setModalSelectedAtividadeId] = useState<
    number | null
  >(null);

  // controla se o modal de desempenho renderiza o modo "plugged" (com componente) ou "unplugged" (lista de respostas)
  const [desempenhoView, setDesempenhoView] = useState<"plugged" | "unplugged">(
    "unplugged"
  );

  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [atividadesTurma, setAtividadesTurma] = useState<Atividade[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);

  const [popupAberto, setPopupAberto] = useState(false);
  const [modalTurmaAberto, setModalTurmaAberto] = useState(false);
  const [modalDesempenhoAberto, setModalDesempenhoAberto] = useState(false);

  // Aluno details popup (dynamic): when a professor clicks a student's name in a resposta
  // we open this modal showing the student's Nome / Email / ID. We try to reuse
  // data present in `respostaDetalhe.aluno` and fall back to fetching the alunos
  // list if needed.
  const [alunoPopupOpen, setAlunoPopupOpen] = useState(false);
  const [alunoDetalhes, setAlunoDetalhes] = useState<{
    idAluno?: number;
    nome?: string | null;
    email?: string | null;
  } | null>(null);

  // Novos estados para respostas/desempenho (preservados)
  const [respostas, setRespostas] = useState<RespostaResumo[]>([]);
  const [loadingRespostas, setLoadingRespostas] = useState(false);
  const [respostaDetalhe, setRespostaDetalhe] = useState<RespostaResumo | null>(
    null
  );

  // criar turma
  const [nomeTurma, setNomeTurma] = useState("");
  const [alunos, setAlunos] = useState<
    { nome: string; email: string; senha: string }[]
  >([]);
  const [showAlunoForm, setShowAlunoForm] = useState(false);
  const [formAluno, setFormAluno] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  // aplicar atividade
  const [modalAplicarAberto, setModalAplicarAberto] = useState(false);
  const [atividadeParaAplicar, setAtividadeParaAplicar] =
    useState<Atividade | null>(null);

  const [_turmaSelecionadaParaAplicacao, setTurmaSelecionadaParaAplicacao] =
    useState<Turma | null>(null);
  const [_confirmApplyModalOpen, setConfirmApplyModalOpen] = useState(false);

  const [turmasSelecionadas, setTurmasSelecionadas] = useState<number[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const [isCreatingTurma, setIsCreatingTurma] = useState(false);

  // Settings modal states
  const [settingsModalAberto, setSettingsModalAberto] = useState(false);
  const [turmaParaEditar, setTurmaParaEditar] = useState<Turma | null>(null);
  const [editNomeTurma, setEditNomeTurma] = useState("");
  const [editingAlunoId, setEditingAlunoId] = useState<number | null>(null);
  const [editAlunoForm, setEditAlunoForm] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });
  const [showAddAlunoForm, setShowAddAlunoForm] = useState(false);
  const [newAlunoForm, setNewAlunoForm] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [correcaoModalAberto, setCorrecaoModalAberto] = useState(false);
  const [respostaParaCorrigir, setRespostaParaCorrigir] =
    useState<RespostaResumo | null>(null);
  const [notaCorrecao, setNotaCorrecao] = useState<number | "">("");
  const [feedbackCorrecao, setFeedbackCorrecao] = useState<string>("");
  const [isSubmittingCorrecao, setIsSubmittingCorrecao] = useState(false);

  const router = useRouter();

  // studentId (optional) read from localStorage so we can send to save endpoint
  const [studentId, setStudentId] = useState<number | null>(null);
  // helper: open aluno details (use existing object if provided, else fetch list and find)
  async function openAlunoDetalhes(
    alunoObj?: {
      idAluno?: number;
      nome?: string | null;
      email?: string | null;
    } | null,
    idFallback?: number | null
  ) {
    if (alunoObj && (alunoObj.nome || alunoObj.email || alunoObj.idAluno)) {
      setAlunoDetalhes(alunoObj);
      setAlunoPopupOpen(true);
      return;
    }

    const targetId = idFallback ?? alunoObj?.idAluno ?? null;
    if (!targetId) {
      // nothing to show
      setAlunoDetalhes(null);
      setAlunoPopupOpen(true);
      return;
    }

    try {
      const r = await fetch(
        `/api/alunos/aluno?id=${encodeURIComponent(String(targetId))}`
      );
      if (r.ok) {
        const found = await r.json().catch(() => null);
        if (found) {
          setAlunoDetalhes(found);
          setAlunoPopupOpen(true);
          return;
        }
      }

      // fallback: try fetching the list and find
      const r2 = await fetch("/api/alunos/aluno");
      if (r2.ok) {
        const list = (await r2.json().catch(() => null)) as Array<{
          idAluno?: number;
          nome?: string;
          email?: string;
        }> | null;
        if (Array.isArray(list)) {
          const found = list.find(
            (s) => Number(s.idAluno) === Number(targetId)
          );
          if (found) {
            setAlunoDetalhes(found);
            setAlunoPopupOpen(true);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("openAlunoDetalhes fallback failed:", e);
    }

    // fallback: open with minimal info
    setAlunoDetalhes({ idAluno: targetId });
    setAlunoPopupOpen(true);
  }

  useEffect(() => {
    const idAluno = localStorage.getItem("idAluno");
    if (idAluno) setStudentId(Number(idAluno));
    const id = localStorage.getItem("idProfessor");
    const nome = localStorage.getItem("nomeProfessor");
    const email = localStorage.getItem("emailProfessor");

    // expose for later use inside this effect's scope — attach to window for debug if needed
    window.openAlunoDetalhes = openAlunoDetalhes;

    if (id) setProfessorId(Number(id));
    if (nome) setProfessorNome(nome);
    if (email) setProfessorEmail(email);
  }, []);

  // --- funções existentes preservadas (fetchTurmas, fetchAtividades, fetchAtividadesTurma, etc.) ---
  const fetchTurmas = useCallback(async () => {
    if (!professorId) return;
    setLoadingTurmas(true);
    try {
      const res = await fetch(`/api/turma?professorId=${professorId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => null);
      if (Array.isArray(data)) setTurmas(data);
      else setTurmas([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao buscar turmas:", msg);
      setTurmas([]);
    } finally {
      setLoadingTurmas(false);
    }
  }, [professorId]);

  useEffect(() => {
    if (professorId) fetchTurmas();
  }, [professorId, fetchTurmas]);

  useEffect(() => {
    if (!turmaSelecionada) {
      fetchAtividades();
      setAtividadesTurma([]);
    } else {
      fetchAtividadesTurma(turmaSelecionada.idTurma);
    }
  }, [turmaSelecionada, professorId]);

  async function fetchAtividades() {
    setLoadingAtividades(true);
    try {
      const res = await fetch(`/api/professores/atividadesprofessor`);
      const data = (await res.json().catch(() => null)) as unknown;
      if (res.ok) {
        if (Array.isArray(data)) setAtividades(data as Atividade[]);
        else if (data && typeof data === "object") {
          const maybe = data as Record<string, unknown>;
          if (Array.isArray(maybe.atividades))
            setAtividades(maybe.atividades as Atividade[]);
          else setAtividades([]);
        } else {
          setAtividades([]);
        }
      } else {
        setAtividades([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro fetching atividades:", msg);
      setAtividades([]);
    } finally {
      setLoadingAtividades(false);
    }
  }

  // fetchAtividadesTurma agora usa /api/atividades/turma
  async function fetchAtividadesTurma(idTurma: number) {
    setLoadingAtividades(true);
    try {
      const res = await fetch(
        `/api/atividades/turma?turmaId=${encodeURIComponent(String(idTurma))}`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn("fetchAtividadesTurma non-ok:", res.status, data);
        setAtividadesTurma([]);
        return;
      }
      let arr: unknown = data;
      if (!Array.isArray(arr)) {
        if (
          data &&
          typeof data === "object" &&
          Array.isArray((data as Record<string, unknown>).atividades)
        )
          arr = (data as Record<string, unknown>).atividades;
        else {
          setAtividadesTurma([]);
          return;
        }
      }
      const normalized: Atividade[] = (arr as unknown[]).map(
        (item: unknown) => {
          const it = item as Record<string, unknown>;
          const atividadeObj = (it.atividade ?? it) as Record<string, unknown>;
          const arquivos = (atividadeObj.arquivos ??
            it.arquivos ??
            []) as unknown[];
          return {
            idAtividade: Number(
              atividadeObj.idAtividade ?? atividadeObj.idAtividadeTurma
            ),
            titulo: String(
              atividadeObj.titulo ??
                `Atividade ${atividadeObj.idAtividade ?? ""}`
            ),
            descricao: atividadeObj.descricao as string | undefined,
            tipo: atividadeObj.tipo as string | undefined,
            nota:
              typeof atividadeObj.nota === "number"
                ? (atividadeObj.nota as number)
                : undefined,
            isStatic: atividadeObj.isStatic as boolean | undefined,
            source: atividadeObj.source as string | undefined,
            arquivos: (arquivos as unknown[]).map((f) => {
              const ff = f as Record<string, unknown>;
              return {
                idArquivo: Number(ff.idArquivo ?? 0),
                url: String(ff.url ?? ""),
                tipoArquivo: ff.tipoArquivo as string | undefined,
                nomeArquivo: ff.nomeArquivo as string | undefined,
              };
            }),
          } as Atividade;
        }
      );
      setAtividadesTurma(normalized);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro fetching atividades da turma:", msg);
      setAtividadesTurma([]);
    } finally {
      setLoadingAtividades(false);
    }
  }

  function selecionarTurmaById(idTurma: number) {
    const turma = turmas.find((t) => t.idTurma === idTurma) || null;
    setTurmaSelecionada(turma);
    // collapse expanded activity when switching turma
    setExpandedAtividadeId(null);
    setAtividadeDetalhe(null);
    setRespostas([]); // limpa respostas quando troca turma
  }

  // Toggle expand/collapse inline
  function toggleExpandAtividade(id: number) {
    setExpandedAtividadeId((prev) => (prev === id ? null : id));
    // ensure turmas are loaded so actions inside can work
    if (professorId) fetchTurmas();
    // clear atividadeDetalhe to avoid confusion (we show inline)
    setAtividadeDetalhe(null);
  }

  function toggleUserPopup() {
    setPopupAberto((p) => !p);
  }

  function abrirModalTurma() {
    setModalTurmaAberto(true);
    setNomeTurma("");
    setAlunos([]);
    setShowAlunoForm(false);
    setFormAluno({ nome: "", email: "", senha: "", confirmarSenha: "" });
  }
  function fecharModalTurma() {
    setModalTurmaAberto(false);
    setShowAlunoForm(false);
  }

  async function criarTurma() {
    if (!nomeTurma || alunos.length === 0 || !professorId) {
      alert(
        "Nome da turma, um aluno e estar logado como professor são obrigatórios!"
      );
      return;
    }
    setIsCreatingTurma(true);
    try {
      const res = await fetch("/api/turma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeTurma, professorId, alunos }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        alert("Turma criada!");
        fecharModalTurma();
        fetchTurmas();
      } else {
        alert(data?.error || "Erro ao criar turma.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao criar turma:", msg);
      alert("Erro de conexão ao criar turma.");
    } finally {
      setIsCreatingTurma(false);
    }
  }

  // prefixadas com '_' porque atualmente não são referenciadas em outros lugares
  function _mostrarDesempenho() {
    setModalDesempenhoAberto(true);
  }
  function _fecharModalDesempenho() {
    setModalDesempenhoAberto(false);
  }

  function handleAlunoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormAluno({ ...formAluno, [e.target.name]: e.target.value });
  }
  function abrirAlunoForm() {
    setShowAlunoForm(true);
    setFormAluno({ nome: "", email: "", senha: "", confirmarSenha: "" });
  }
  function cancelarAlunoForm() {
    setShowAlunoForm(false);
    setFormAluno({ nome: "", email: "", senha: "", confirmarSenha: "" });
  }
  function adicionarAluno(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (formAluno.senha !== formAluno.confirmarSenha) {
      alert("As senhas não coincidem!");
      return;
    }
    if (!formAluno.nome || !formAluno.email || !formAluno.senha) {
      alert("Preencha todos os campos do aluno!");
      return;
    }
    setAlunos([
      ...alunos,
      { nome: formAluno.nome, email: formAluno.email, senha: formAluno.senha },
    ]);
    setShowAlunoForm(false);
    setFormAluno({ nome: "", email: "", senha: "", confirmarSenha: "" });
  }
  function removerAluno(idx: number) {
    setAlunos(alunos.filter((_, i) => i !== idx));
  }

  async function abrirModalAplicar(atividade: Atividade) {
    if (professorId) {
      await fetchTurmas();
    }
    setAtividadeParaAplicar(atividade);
    setTurmasSelecionadas([]);
    setConfirmApplyModalOpen(false);
    setModalAplicarAberto(true);
  }
  function fecharModalAplicar() {
    setModalAplicarAberto(false);
    setAtividadeParaAplicar(null);
    setTurmasSelecionadas([]);
    setTurmaSelecionadaParaAplicacao(null);
    setConfirmApplyModalOpen(false);
  }

  function toggleTurmaSelection(turmaId: number) {
    setTurmasSelecionadas((prev) =>
      prev.includes(turmaId)
        ? prev.filter((id) => id !== turmaId)
        : [...prev, turmaId]
    );
  }

  async function aplicarEmMultiplasTurmas() {
    if (!atividadeParaAplicar) return;
    if (turmasSelecionadas.length === 0) {
      alert("Selecione pelo menos uma turma para aplicar a atividade!");
      return;
    }
    setIsApplying(true);
    try {
      const promessas = turmasSelecionadas.map(async (idTurma) => {
        try {
          const res = await fetch("/api/aplicaratividade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idAtividade: atividadeParaAplicar.idAtividade,
              idTurma,
            }),
          });
          let data: unknown = null;
          try {
            data = await res.json();
          } catch {
            data = { raw: await res.text().catch(() => "") };
          }
          return { idTurma, ok: res.ok, status: res.status, data };
        } catch (err) {
          return {
            idTurma,
            ok: false,
            err: err instanceof Error ? err.message : String(err),
          };
        }
      });

      const resultados = await Promise.all(promessas);
      const sucessos = resultados.filter((r) => r.ok);
      const falhas = resultados.filter((r) => !r.ok);
      if (sucessos.length > 0)
        alert(
          `Atividade "${atividadeParaAplicar!.titulo}" aplicada em ${
            sucessos.length
          } turma(s).`
        );
      if (falhas.length > 0) {
        const msgs = falhas
          .map((f) => {
            const turma = turmas.find((t) => t.idTurma === f.idTurma);
            const nome = turma?.nome ?? `Turma ${f.idTurma}`;
            const errMsg =
              (f.data &&
                typeof f.data === "object" &&
                (f.data as Record<string, unknown>).error) ||
              (f.err && String(f.err)) ||
              `status ${f.status}`;
            return `${nome}: ${errMsg}`;
          })
          .join("\n");
        alert(`Falhas em ${falhas.length} turma(s):\n${msgs}`);
      }
      setTurmasSelecionadas([]);
      setModalAplicarAberto(false);
      setAtividadeParaAplicar(null);
      if (
        turmaSelecionada &&
        turmasSelecionadas.includes(turmaSelecionada.idTurma)
      )
        fetchAtividadesTurma(turmaSelecionada.idTurma);
      fetchTurmas();
    } finally {
      setIsApplying(false);
    }
  }

  // abrirAtividadeArquivo e excluirTurma preservados (mantidos)
  // renomeada para evitar warning quando não referenciada
  function _openAtividadeArquivo(atividade: Atividade) {
    try {
      const arquivos = atividade.arquivos ?? [];
      if (arquivos.length === 0) {
        alert("Nenhum arquivo anexado para esta atividade.");
        return;
      }
      const url = arquivos[0].url;
      const finalUrl = url.startsWith("http")
        ? url
        : `${window.location.origin}${url}`;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao abrir arquivo da atividade:", msg);
      alert("Não foi possível abrir o arquivo. Veja o console.");
    }
  }

  async function excluirTurma(turmaId: number, nomeTurma: string) {
    const confirmacao = window.confirm(
      `Você tem certeza que deseja excluir a turma "${nomeTurma}"?\n\nEsta ação irá:\n• Remover todos os alunos desta turma\n• Remover todas as atividades aplicadas\n• Excluir permanentemente a turma\n\nEsta ação NÃO pode ser desfeita!`
    );
    if (!confirmacao) return;
    try {
      const res = await fetch("/api/turma", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turmaId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Turma "${nomeTurma}" foi excluída com sucesso!`);
        if (turmaSelecionada?.idTurma === turmaId) {
          setTurmaSelecionada(null);
          setAtividadesTurma([]);
        }
        fetchTurmas();
      } else {
        alert(` Erro ao excluir turma: ${data.error}`);
      }
    } catch (err) {
      console.error("Erro ao excluir turma:", err);
      alert(" Erro de conexão ao excluir turma");
    }
  }

  // Helper: extrai um id de atividade confiável de várias formas de objeto
  function getAtividadeIdFrom(obj: unknown): number | null {
    if (!obj) return null;
    const o = obj as Record<string, unknown>;
    const cand =
      o.idAtividade ??
      o.idAtividadeTurma ??
      (o.atividade as Record<string, unknown>)?.idAtividade;
    if (cand == null || cand === "") return null;
    const n = Number(cand);
    return Number.isFinite(n) ? n : null;
  }

  // Abre modal de desempenho garantindo id/objeto normalizado
  async function mostrarDesempenhoParaAtividadeAplicada(atividade: unknown) {
    // exige seleção de turma em contexto de visualização por turma
    if (!turmaSelecionada) {
      alert("Selecione uma turma primeiro.");
      return;
    }

    const id = getAtividadeIdFrom(atividade);
    if (!id) {
      alert("Não foi possível identificar a atividade para ver o desempenho.");
      return;
    }

    // normaliza o objeto recebido (pode ser a atividade ou um wrapper { atividade, ... })
    const a = atividade as Record<string, unknown>;
    const atividadeObj = (a.atividade ?? a) as Record<string, unknown>;

    const titulo = (atividadeObj.titulo ??
      a.titulo ??
      `Atividade ${id}`) as string;
    const descricao = (atividadeObj.descricao ?? a.descricao ?? "") as
      | string
      | undefined;
    const tipo = (atividadeObj.tipo ?? a.tipo) as string | undefined;

    const arquivosRaw = (atividadeObj.arquivos ??
      a.arquivos ??
      []) as unknown[];
    const arquivos: Arquivo[] = arquivosRaw.map((f) => {
      const ff = f as Record<string, unknown>;
      return {
        idArquivo: Number(ff.idArquivo ?? 0),
        url: String(ff.url ?? ""),
        tipoArquivo: ff.tipoArquivo as string | undefined,
      };
    });

    const normalized: Atividade = {
      idAtividade: id,
      titulo,
      descricao,
      tipo,
      arquivos,
    };

    // normaliza e abre modal — primeiro busca as respostas para já ter os dados
    setExpandedAtividadeId(normalized.idAtividade);
    setAtividadeDetalhe(normalized);
    setModalSelectedAtividadeId(normalized.idAtividade);

    // escolhe modo de visualização conforme tipo da atividade
    const mode =
      (normalized.tipo ?? "").toUpperCase() === "PLUGGED"
        ? "plugged"
        : "unplugged";
    setDesempenhoView(mode);

    // carrega respostas antes de abrir (para a UI unplugged mostrar a lista)
    try {
      await fetchRespostasParaAtividade(
        normalized.idAtividade,
        turmaSelecionada.idTurma
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao pré-carregar respostas:", msg);
      // continua mesmo em erro
    }

    setModalDesempenhoAberto(true);
  }

  // --- NOVO: buscar respostas para a atividade aplicada na turma selecionada (preservado) ---
  const fetchRespostasParaAtividade = useCallback(
    async (idAtividade: number, idTurma?: number) => {
      if (!idAtividade) return;
      setLoadingRespostas(true);
      try {
        const turmaQuery = idTurma
          ? `&turmaId=${encodeURIComponent(String(idTurma))}`
          : "";
        const res = await fetch(
          `/api/respostas?atividadeId=${encodeURIComponent(
            String(idAtividade)
          )}${turmaQuery}`
        );
        const data = (await res.json().catch(() => null)) as unknown;
        if (res.ok) {
          if (Array.isArray(data)) {
            setRespostas(data as RespostaResumo[]);
          } else if (data && typeof data === "object") {
            const maybe = data as Record<string, unknown>;
            if (Array.isArray(maybe.respostas))
              setRespostas(maybe.respostas as RespostaResumo[]);
            else setRespostas([]);
          } else {
            setRespostas([]);
          }
        } else {
          setRespostas([]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Erro ao buscar respostas:", msg);
        setRespostas([]);
      } finally {
        // garante que o indicador de loading seja sempre desligado
        setLoadingRespostas(false);
      }
    },
    []
  );

  // abre o detalhe da resposta buscando a versão mais recente do servidor
  async function abrirRespostaDetalhe(r: RespostaResumo) {
    try {
      // tentativa direta por id (algumas APIs não permitem GET /api/respostas/:id -> 405)
      const res = await fetch(
        `/api/respostas/${encodeURIComponent(String(r.idResposta))}`
      );
      if (res.status === 405) throw new Error("MethodNotAllowed");
      const data = (await res.json().catch(() => null)) as unknown;
      let latest: RespostaResumo = r;
      if (res.ok && data && typeof data === "object") {
        const maybe = data as Record<string, unknown>;
        if (maybe.resposta && typeof maybe.resposta === "object") {
          latest = maybe.resposta as RespostaResumo;
        } else if ("idResposta" in maybe) {
          latest = maybe as RespostaResumo;
        }
      }
      setRespostaDetalhe(latest);
      return;
    } catch (err: unknown) {
      console.warn(
        "abrirRespostaDetalhe: fetch by id failed, falling back:",
        err
      );
      // fallback: buscar pela lista de respostas da atividade/turma e encontrar pelo id
      try {
        const atividadeId =
          modalSelectedAtividadeId ?? atividadeDetalhe?.idAtividade ?? null;
        const turmaQuery = turmaSelecionada
          ? `&turmaId=${encodeURIComponent(String(turmaSelecionada.idTurma))}`
          : "";
        if (atividadeId) {
          const listRes = await fetch(
            `/api/respostas?atividadeId=${encodeURIComponent(
              String(atividadeId)
            )}${turmaQuery}`
          );
          const listData = (await listRes.json().catch(() => null)) as unknown;
          let arr: unknown[] = [];
          if (listRes.ok && Array.isArray(listData))
            arr = listData as unknown[];
          else if (
            listRes.ok &&
            listData &&
            typeof listData === "object" &&
            Array.isArray((listData as Record<string, unknown>).respostas)
          )
            arr = (listData as Record<string, unknown>).respostas as unknown[];
          const found = arr.find(
            (x) =>
              Number((x as Record<string, unknown>).idResposta) ===
              Number(r.idResposta)
          );
          if (found) {
            setRespostaDetalhe(found as RespostaResumo);
            return;
          }
        }
      } catch (err2: unknown) {
        const msg2 = err2 instanceof Error ? err2.message : String(err2);
        console.error("abrirRespostaDetalhe fallback error:", msg2);
      }
      // último recurso: mostrar o objeto recebido inicialmente
      setRespostaDetalhe(r);
    }
  }

  function fecharRespostaDetalhe() {
    setRespostaDetalhe(null);
  }

  // --- NOVO: correção inline (modal) ---
  async function abrirModalCorrecao(resposta: RespostaResumo) {
    setIsSubmittingCorrecao(false);
    setCorrecaoModalAberto(false);
    try {
      // tenta fetch direto por id (algumas rotas podem devolver 405)
      const res = await fetch(
        `/api/respostas/${encodeURIComponent(String(resposta.idResposta))}`
      );
      if (res.status === 405 || !res.ok)
        throw new Error("MethodNotAllowedOrNotOk");
      const data = (await res.json().catch(() => null)) as unknown;
      let latest: RespostaResumo = resposta;
      if (data && typeof data === "object") {
        const maybe = data as Record<string, unknown>;
        if (maybe.resposta && typeof maybe.resposta === "object") {
          latest = maybe.resposta as RespostaResumo;
        } else if ("idResposta" in maybe) {
          latest = maybe as RespostaResumo;
        }
      }
      setRespostaParaCorrigir(latest);
      setNotaCorrecao(latest.notaObtida ?? "");
      setFeedbackCorrecao(latest.feedback ?? "");
    } catch {
      // fallback: buscar lista de respostas da atividade/turma e encontrar pelo id
      try {
        const atividadeId =
          modalSelectedAtividadeId ?? atividadeDetalhe?.idAtividade ?? null;
        const turmaQuery = turmaSelecionada
          ? `&turmaId=${encodeURIComponent(String(turmaSelecionada.idTurma))}`
          : "";
        if (atividadeId) {
          const listRes = await fetch(
            `/api/respostas?atividadeId=${encodeURIComponent(
              String(atividadeId)
            )}${turmaQuery}`
          );
          const listData = (await listRes.json().catch(() => null)) as unknown;
          let arr: unknown[] = [];
          if (listRes.ok && Array.isArray(listData))
            arr = listData as unknown[];
          else if (
            listRes.ok &&
            listData &&
            typeof listData === "object" &&
            Array.isArray((listData as Record<string, unknown>).respostas)
          )
            arr = (listData as Record<string, unknown>).respostas as unknown[];
          const found = arr.find(
            (x) =>
              Number((x as Record<string, unknown>).idResposta) ===
              Number(resposta.idResposta)
          );
          if (found) {
            const f = found as RespostaResumo;
            setRespostaParaCorrigir(f);
            setNotaCorrecao(f.notaObtida ?? "");
            setFeedbackCorrecao(f.feedback ?? "");
            setCorrecaoModalAberto(true);
            // foco simples no campo de nota
            setTimeout(() => {
              const el = document.querySelector<HTMLInputElement>(
                'input[type="number"]'
              );
              el?.focus();
            }, 120);
            return;
          }
        }
      } catch (err2: unknown) {
        const msg2 = err2 instanceof Error ? err2.message : String(err2);
        console.warn("abrirModalCorrecao fallback failed:", msg2);
      }
      // fallback final: usa o objeto recebido
      setRespostaParaCorrigir(resposta);
      setNotaCorrecao(resposta.notaObtida ?? "");
      setFeedbackCorrecao(resposta.feedback ?? "");
    } finally {
      // sempre abre o modal mesmo em fallback
      setCorrecaoModalAberto(true);
      setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>(
          'input[type="number"]'
        );
        el?.focus();
      }, 120);
    }
  }

  async function enviarCorrecao() {
    if (!respostaParaCorrigir) return;
    // validação simples
    if (
      notaCorrecao !== "" &&
      (Number(notaCorrecao) < 0 || Number(notaCorrecao) > 10)
    ) {
      alert("Nota deve estar entre 0 e 10.");
      return;
    }
    setIsSubmittingCorrecao(true);
    try {
      const payload: Record<string, unknown> = {};
      if (notaCorrecao !== "") payload.notaObtida = Number(notaCorrecao);
      payload.feedback = feedbackCorrecao ?? null;

      const res = await fetch(
        `/api/respostas/${encodeURIComponent(
          String(respostaParaCorrigir.idResposta)
        )}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        const errMsg =
          data && typeof data === "object"
            ? (data as Record<string, unknown>).error
            : String(data);
        alert(errMsg || `Erro ao salvar correção (${res.status})`);
        return;
      }
      const updatedId = (data &&
        (data as Record<string, unknown>).idResposta) as number | undefined;
      const updatedNota = (data &&
        (data as Record<string, unknown>).notaObtida) as number | undefined;
      const updatedFeedback = (data &&
        (data as Record<string, unknown>).feedback) as string | undefined;

      // Atualiza o estado local de respostas para refletir a correção e feedback
      setRespostas((prev) =>
        prev.map((r) =>
          r.idResposta === updatedId
            ? {
                ...r,
                notaObtida: updatedNota ?? r.notaObtida,
                feedback: updatedFeedback ?? r.feedback,
              }
            : r
        )
      );
      // atualiza o modal de correção e o detalhe caso estejam abertos para a mesma resposta
      setRespostaParaCorrigir((prev) =>
        prev && prev.idResposta === updatedId
          ? {
              ...prev,
              notaObtida: updatedNota ?? prev.notaObtida,
              feedback: updatedFeedback ?? prev.feedback,
            }
          : prev
      );
      setRespostaDetalhe((prev) =>
        prev && prev.idResposta === updatedId
          ? {
              ...prev,
              notaObtida: updatedNota ?? prev.notaObtida,
              feedback: updatedFeedback ?? prev.feedback,
            }
          : prev
      );
      alert("Correção salva com sucesso.");
      setCorrecaoModalAberto(false);
      // recarrega a lista de respostas para garantir consistência (opcional)
      if (atividadeDetalhe && turmaSelecionada) {
        await fetchRespostasParaAtividade(
          atividadeDetalhe.idAtividade,
          turmaSelecionada.idTurma
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro enviarCorrecao:", msg);
      alert("Erro ao enviar correção.");
    } finally {
      setIsSubmittingCorrecao(false);
    }
  }

  // prefixada com '_' pois a navegação de logout usa router diretamente no popup
  function _sairSistema() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("idProfessor");
      localStorage.removeItem("nomeProfessor");
      localStorage.removeItem("emailProfessor");
      router.push("/loginprofessor");
    }
  }

  // ActivityItem: collapsible card rendered inline and centered width
  function ActivityItem({ atividade }: { atividade: Atividade }) {
    const isExpanded = expandedAtividadeId === atividade.idAtividade;

    const onToggle = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      toggleExpandAtividade(atividade.idAtividade);
    };

    return (
      <li
        key={atividade.idAtividade}
        style={{ listStyle: "none", marginBottom: 18 }}
      >
        <div
          className={styles.card}
          onClick={onToggle}
          style={{
            display: "block",
            background: "#3a3360",
            color: "#fff",
            padding: 18,
            borderRadius: 8,
            cursor: "pointer",
            maxWidth: 960,
            margin: "0 auto",
            boxShadow: isExpanded
              ? "0 30px 60px rgba(0,0,0,0.6)"
              : "0 8px 20px rgba(0,0,0,0.45)",
            transform: isExpanded ? "translateY(-6px)" : "none",
            transition: "all 180ms ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <strong>{atividade.titulo}</strong>
              <div style={{ color: "#d1cde6", marginTop: 6 }}>
                {isExpanded
                  ? atividade.descricao || "Sem descrição."
                  : atividade.descricao
                  ? atividade.descricao.substring(0, 160) +
                    (atividade.descricao.length > 160 ? "…" : "")
                  : "Sem descrição."}
              </div>
            </div>
          </div>

          {isExpanded && (
            <div
              style={{
                marginTop: 12,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: 12,
                color: "#dcd7ee",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* If the activity is a PLUGGED static activity, render the MCQ component inline */}
              {atividade.tipo === "PLUGGED" ? (
                <div>
                  <PluggedContagemMCQ
                    fetchEndpoint="/api/atividades/plugged/contagem-instance"
                    saveEndpoint="/api/respostas/plugged"
                    alunoId={studentId}
                    initialLoad={true}
                    atividadeId={atividade.idAtividade}
                    turmaId={turmaSelecionada?.idTurma ?? null}
                    isProfessor={true}
                  />

                  {/* ações para atividades PLUGGED */}
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {turmaSelecionada ? (
                      <button
                        className={styles.btn}
                        onClick={() =>
                          mostrarDesempenhoParaAtividadeAplicada(atividade)
                        }
                        style={{ background: "#6a5acd", color: "#fff" }}
                      >
                        Ver Desempenho
                      </button>
                    ) : (
                      <>
                        <button
                          className={styles.btn}
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalAplicar(atividade);
                          }}
                          style={{ background: "#2196f3", color: "#fff" }}
                        >
                          Aplicar em turmas
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 12 }}>
                    <strong>Arquivos</strong>
                    {atividade.arquivos && atividade.arquivos.length > 0 ? (
                      <ul
                        style={{ listStyle: "none", padding: 0, marginTop: 8 }}
                      >
                        {atividade.arquivos.map((a) => (
                          <li
                            key={a.idArquivo}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 0",
                            }}
                          >
                            <span style={{ color: "#fff" }}>
                              {a.url.split("/").pop()}
                            </span>
                            <button
                              className={styles.btn}
                              onClick={(e) => {
                                e.stopPropagation();
                                const finalUrl = a.url.startsWith("http")
                                  ? a.url
                                  : `${window.location.origin}${a.url}`;
                                window.open(
                                  finalUrl,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }}
                              style={{
                                background: "#00bcd4",
                                color: "#042027",
                              }}
                            >
                              Abrir
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ color: "#bdbdda", marginTop: 8 }}>
                        Nenhum anexo.
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {/* botão de desempenho — aparece somente quando estamos dentro de uma turma */}
                    {turmaSelecionada && (
                      <button
                        className={styles.btn}
                        onClick={() =>
                          mostrarDesempenhoParaAtividadeAplicada(atividade)
                        }
                        style={{ background: "#6a5acd", color: "#fff" }}
                      >
                        Ver Desempenho
                      </button>
                    )}

                    <button
                      className={styles.btnVoltarModal}
                      onClick={() => setExpandedAtividadeId(null)}
                      style={{ marginLeft: "auto" }}
                    >
                      Fechar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </li>
    );
  }

  // Settings modal handlers
  function abrirSettingsModal(turma: Turma) {
    setTurmaParaEditar(turma);
    setEditNomeTurma(turma.nome);
    setEditingAlunoId(null);
    setEditAlunoForm({ nome: "", email: "", senha: "", confirmarSenha: "" });
    setSettingsModalAberto(true);
  }

  function fecharSettingsModal() {
    setSettingsModalAberto(false);
    setTurmaParaEditar(null);
    setEditNomeTurma("");
    setEditingAlunoId(null);
    setEditAlunoForm({ nome: "", email: "", senha: "", confirmarSenha: "" });
    setShowAddAlunoForm(false);
    setNewAlunoForm({ nome: "", email: "", senha: "", confirmarSenha: "" });
  }

  async function salvarNomeTurma() {
    if (!turmaParaEditar) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/turma`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idTurma: turmaParaEditar.idTurma,
          nome: editNomeTurma,
        }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar nome da turma");
      alert("Nome da turma atualizado!");
      await fetchTurmas();
      if (turmaSelecionada?.idTurma === turmaParaEditar.idTurma) {
        const updated = turmas.find(
          (t) => t.idTurma === turmaParaEditar.idTurma
        );
        if (updated) setTurmaSelecionada(updated);
      }
      const updatedTurma = turmas.find(
        (t) => t.idTurma === turmaParaEditar.idTurma
      );
      if (updatedTurma) setTurmaParaEditar(updatedTurma);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setIsSavingSettings(false);
    }
  }

  function iniciarEdicaoAluno(aluno: {
    aluno: { idAluno: number; nome: string; email: string };
  }) {
    setEditingAlunoId(aluno.aluno.idAluno);
    setEditAlunoForm({
      nome: aluno.aluno.nome,
      email: aluno.aluno.email,
      senha: "",
      confirmarSenha: "",
    });
  }

  async function salvarEdicaoAluno() {
    if (!editingAlunoId) return;

    // Validate password confirmation if password is being changed
    if (editAlunoForm.senha.trim()) {
      if (editAlunoForm.senha !== editAlunoForm.confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
      }
    }

    setIsSavingSettings(true);

    // Validate password confirmation if password is being changed
    if (editAlunoForm.senha.trim()) {
      if (editAlunoForm.senha !== editAlunoForm.confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
      }
    }

    setIsSavingSettings(true);
    try {
      const payload: { nome: string; email: string; senha?: string } = {
        nome: editAlunoForm.nome,
        email: editAlunoForm.email,
      };
      if (editAlunoForm.senha.trim()) {
        payload.senha = editAlunoForm.senha;
      }
      const res = await fetch(`/api/alunos/aluno`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingAlunoId, ...payload }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar aluno");
      alert("Aluno atualizado!");
      await fetchTurmas();
      const updatedTurma = turmas.find(
        (t) => t.idTurma === turmaParaEditar?.idTurma
      );
      if (updatedTurma) setTurmaParaEditar(updatedTurma);
      setEditingAlunoId(null);
      setEditAlunoForm({ nome: "", email: "", senha: "", confirmarSenha: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function excluirAlunoDaTurma(idAluno: number, nomeAluno: string) {
    if (!turmaParaEditar) return;
    if (!confirm(`Tem certeza que deseja remover ${nomeAluno} da turma?`))
      return;
    setIsSavingSettings(true);
    try {
      const url = `/api/turma?idTurma=${turmaParaEditar.idTurma}&idAluno=${idAluno}`;
      console.log("DELETE request URL:", url);

      const res = await fetch(url, { method: "DELETE" });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        throw new Error(data.error || data.details || "Erro ao remover aluno");
      }

      alert("Aluno removido da turma!");
      await fetchTurmas();
      const updatedTurma = turmas.find(
        (t) => t.idTurma === turmaParaEditar.idTurma
      );
      if (updatedTurma) setTurmaParaEditar(updatedTurma);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error removing aluno:", err);
      alert(msg);
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function adicionarAlunoNaTurma() {
    if (!turmaParaEditar) return;

    if (
      !newAlunoForm.nome.trim() ||
      !newAlunoForm.email.trim() ||
      !newAlunoForm.senha.trim()
    ) {
      alert("Preencha todos os campos!");
      return;
    }

    if (newAlunoForm.senha !== newAlunoForm.confirmarSenha) {
      alert("As senhas não coincidem!");
      return;
    }

    setIsSavingSettings(true);
    try {
      // First create the aluno
      const createRes = await fetch(`/api/alunos/aluno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: newAlunoForm.nome,
          email: newAlunoForm.email,
          senha: newAlunoForm.senha,
        }),
      });

      if (!createRes.ok) {
        const error = await createRes.json().catch(() => null);
        throw new Error(error?.error || "Erro ao criar aluno");
      }

      const novoAluno = await createRes.json();

      // Then add the aluno to the turma
      const addRes = await fetch(`/api/turma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeTurma: turmaParaEditar.nome,
          professorId: professorId,
          alunos: [
            {
              nome: novoAluno.nome,
              email: novoAluno.email,
              senha: novoAluno.senha,
            },
          ],
        }),
      });

      if (!addRes.ok) throw new Error("Erro ao adicionar aluno na turma");

      alert("Aluno adicionado com sucesso!");
      await fetchTurmas();
      const updatedTurma = turmas.find(
        (t) => t.idTurma === turmaParaEditar.idTurma
      );
      if (updatedTurma) setTurmaParaEditar(updatedTurma);
      setShowAddAlunoForm(false);
      setNewAlunoForm({ nome: "", email: "", senha: "", confirmarSenha: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <div className={styles.paginaAlunoBody}>
      <aside className={styles.paginaAlunoAside}>
        <div className={styles.logoContainer}>
          <div
            onClick={() => {
              setTurmaSelecionada(null);
              setExpandedAtividadeId(null);
            }}
            style={{ cursor: "pointer" }}
          >
            <Image
              className={styles.logoImg}
              src="/images/logopng.png"
              alt="Logo Codemind"
              width={224}
              height={67}
            />
          </div>
        </div>

        <button
          className={styles.criarBtn}
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            abrirModalTurma();
          }}
          aria-label="Criar Turma"
          style={{ marginTop: "20px", marginBottom: "10px" }}
        >
          Criar Turma
        </button>

        <h2>Minhas Turmas</h2>
        {loadingTurmas ? (
          <p style={{ color: "#fff" }}>Carregando turmas...</p>
        ) : turmas.length === 0 ? (
          <p style={{ color: "#fff" }}>Nenhuma turma cadastrada.</p>
        ) : (
          turmas.map((turma) => (
            <button
              key={turma.idTurma}
              className={`${styles.turmaBtn} ${
                turmaSelecionada?.idTurma === turma.idTurma
                  ? styles.turmaBtnActive
                  : ""
              }`}
              onClick={() => selecionarTurmaById(turma.idTurma)}
            >
              <div className={styles.turmaContent}>
                <span className={styles.turmaInfo}>
                  {turma.nome}({turma.alunos?.length || 0} alunos)
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <span
                    className={styles.deleteIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirSettingsModal(turma);
                    }}
                    title={`Configurações da turma "${turma.nome}"`}
                    style={{ cursor: "pointer", display: "inline-block" }}
                  >
                    ⚙️
                  </span>
                  <span
                    className={styles.deleteIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      excluirTurma(turma.idTurma, turma.nome);
                    }}
                    title={`Excluir turma "${turma.nome}"`}
                    style={{ display: "inline-block" }}
                  >
                    🗑️
                  </span>
                </div>
              </div>
            </button>
          ))
        )}

        {/* Aluno details modal (opened when clicking a student's name in a resposta) */}
        {alunoPopupOpen && (
          <div
            className={`${styles.modal} ${styles.modalActive}`}
            role="dialog"
            aria-modal="true"
            style={{ zIndex: 11030 }}
          >
            <div
              className={styles.modalContent}
              style={{ position: "relative", zIndex: 11031 }}
            >
              <h3>Detalhes do Aluno</h3>
              <p>
                <strong>Nome:</strong> {alunoDetalhes?.nome ?? "—"}
              </p>
              <p>
                <strong>Email:</strong> {alunoDetalhes?.email ?? "—"}
              </p>
              <p>
                <strong>ID:</strong> {alunoDetalhes?.idAluno ?? "—"}
              </p>
              <div style={{ marginTop: 12 }}>
                <button
                  className={styles.btnVoltarModal}
                  onClick={() => setAlunoPopupOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings modal (edit turma name and alunos) */}
        {settingsModalAberto && turmaParaEditar && (
          <div
            className={`${styles.modal} ${styles.modalActive}`}
            role="dialog"
            aria-modal="true"
            style={{ zIndex: 11030 }}
          >
            <div
              className={styles.modalContent}
              style={{
                position: "relative",
                zIndex: 11031,
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              <h3>Configurações da Turma</h3>

              {/* Edit turma name */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#fff",
                  }}
                >
                  <strong>Nome da Turma:</strong>
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={editNomeTurma}
                    onChange={(e) => setEditNomeTurma(e.target.value)}
                    className={styles.input}
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={salvarNomeTurma}
                    disabled={isSavingSettings || !editNomeTurma.trim()}
                    className={styles.btn}
                    style={{ background: "#4caf50", color: "#fff" }}
                  >
                    Salvar
                  </button>
                </div>
              </div>

              <hr style={{ margin: "20px 0", borderColor: "#555" }} />

              {/* List and edit alunos */}
              <div>
                <h4 style={{ color: "#fff", marginBottom: "12px" }}>
                  Alunos da Turma:
                </h4>
                {turmaParaEditar.alunos.length === 0 ? (
                  <p style={{ color: "#fff" }}>
                    Nenhum aluno cadastrado nesta turma.
                  </p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {turmaParaEditar.alunos.map((alunoWrapper) => {
                      const aluno = alunoWrapper.aluno;
                      const isEditing = editingAlunoId === aluno.idAluno;

                      return (
                        <li
                          key={aluno.idAluno}
                          style={{
                            background: "#2b1544",
                            padding: "12px",
                            borderRadius: "8px",
                            marginBottom: "10px",
                          }}
                        >
                          {!isEditing ? (
                            <div>
                              <div style={{ marginBottom: "8px" }}>
                                <strong style={{ color: "#fff" }}>
                                  {aluno.nome}
                                </strong>
                                <br />
                                <span
                                  style={{ color: "#ccc", fontSize: "0.9em" }}
                                >
                                  {aluno.email}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() =>
                                    iniciarEdicaoAluno(alunoWrapper)
                                  }
                                  className={styles.btn}
                                  style={{
                                    background: "#2196f3",
                                    color: "#fff",
                                    fontSize: "0.9em",
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() =>
                                    excluirAlunoDaTurma(
                                      aluno.idAluno,
                                      aluno.nome
                                    )
                                  }
                                  className={styles.btn}
                                  style={{
                                    background: "#b71c1c",
                                    color: "#fff",
                                    fontSize: "0.9em",
                                  }}
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                  marginBottom: "8px",
                                }}
                              >
                                <input
                                  type="text"
                                  placeholder="Nome"
                                  value={editAlunoForm.nome}
                                  onChange={(e) =>
                                    setEditAlunoForm({
                                      ...editAlunoForm,
                                      nome: e.target.value,
                                    })
                                  }
                                  className={styles.input}
                                />
                                <input
                                  type="email"
                                  placeholder="Email"
                                  value={editAlunoForm.email}
                                  onChange={(e) =>
                                    setEditAlunoForm({
                                      ...editAlunoForm,
                                      email: e.target.value,
                                    })
                                  }
                                  className={styles.input}
                                />
                                <input
                                  type="password"
                                  placeholder="Nova Senha (deixe vazio para não alterar)"
                                  value={editAlunoForm.senha}
                                  onChange={(e) =>
                                    setEditAlunoForm({
                                      ...editAlunoForm,
                                      senha: e.target.value,
                                    })
                                  }
                                  className={styles.input}
                                />
                                <input
                                  type="password"
                                  placeholder="Confirmar Nova Senha"
                                  value={editAlunoForm.confirmarSenha}
                                  onChange={(e) =>
                                    setEditAlunoForm({
                                      ...editAlunoForm,
                                      confirmarSenha: e.target.value,
                                    })
                                  }
                                  className={styles.input}
                                />
                              </div>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={salvarEdicaoAluno}
                                  disabled={isSavingSettings}
                                  className={styles.btn}
                                  style={{
                                    background: "#4caf50",
                                    color: "#fff",
                                    fontSize: "0.9em",
                                  }}
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingAlunoId(null);
                                    setEditAlunoForm({
                                      nome: "",
                                      email: "",
                                      senha: "",
                                      confirmarSenha: "",
                                    });
                                  }}
                                  className={styles.btn}
                                  style={{
                                    background: "#757575",
                                    color: "#fff",
                                    fontSize: "0.9em",
                                  }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Add new aluno form */}
                {!showAddAlunoForm ? (
                  <div style={{ marginTop: "16px" }}>
                    <button
                      onClick={() => setShowAddAlunoForm(true)}
                      className={styles.btn}
                      style={{
                        background: "#4caf50",
                        color: "#fff",
                        width: "100%",
                      }}
                    >
                      + Adicionar Aluno
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: "16px",
                      background: "#2b1544",
                      padding: "12px",
                      borderRadius: "8px",
                    }}
                  >
                    <h5 style={{ color: "#fff", marginBottom: "12px" }}>
                      Novo Aluno
                    </h5>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Nome"
                        value={newAlunoForm.nome}
                        onChange={(e) =>
                          setNewAlunoForm({
                            ...newAlunoForm,
                            nome: e.target.value,
                          })
                        }
                        className={styles.input}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newAlunoForm.email}
                        onChange={(e) =>
                          setNewAlunoForm({
                            ...newAlunoForm,
                            email: e.target.value,
                          })
                        }
                        className={styles.input}
                      />
                      <input
                        type="password"
                        placeholder="Senha"
                        value={newAlunoForm.senha}
                        onChange={(e) =>
                          setNewAlunoForm({
                            ...newAlunoForm,
                            senha: e.target.value,
                          })
                        }
                        className={styles.input}
                      />
                      <input
                        type="password"
                        placeholder="Confirmar Senha"
                        value={newAlunoForm.confirmarSenha}
                        onChange={(e) =>
                          setNewAlunoForm({
                            ...newAlunoForm,
                            confirmarSenha: e.target.value,
                          })
                        }
                        className={styles.input}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={adicionarAlunoNaTurma}
                        disabled={isSavingSettings}
                        className={styles.btn}
                        style={{
                          background: "#4caf50",
                          color: "#fff",
                          fontSize: "0.9em",
                        }}
                      >
                        Adicionar
                      </button>
                      <button
                        onClick={() => {
                          setShowAddAlunoForm(false);
                          setNewAlunoForm({
                            nome: "",
                            email: "",
                            senha: "",
                            confirmarSenha: "",
                          });
                        }}
                        className={styles.btn}
                        style={{
                          background: "#757575",
                          color: "#fff",
                          fontSize: "0.9em",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className={styles.btnVoltarModal}
                  onClick={fecharSettingsModal}
                  style={{ background: "#757575" }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className={styles.paginaAlunoMain}>
        <div className={styles.header}>
          <h1>
            Atividades{" "}
            <span className={styles.headerTitleSpan}>
              :{" "}
              {turmaSelecionada
                ? turmaSelecionada.nome
                : "Nenhuma turma selecionada"}
            </span>
          </h1>

          <div className={styles.userInfoWrapper}>
            <div
              className={styles.userInfo}
              onClick={toggleUserPopup}
              style={{ cursor: "pointer" }}
            >
              <Image
                className={styles.userAvatar}
                src="https://www.gravatar.com/avatar/?d=mp"
                alt="Avatar"
                width={40}
                height={40}
                unoptimized
              />
              <div className={styles.userDetails}>
                <span className={styles.userName}>{professorNome}</span>
                <span className={styles.userEmail}>{professorEmail}</span>
              </div>
            </div>
            <div
              className={`${styles.userPopup} ${
                popupAberto ? styles.userPopupActive : ""
              }`}
            >
              <h3>Detalhes do Professor</h3>
              <p>
                <strong>Nome:</strong> {professorNome}
              </p>
              <p>
                <strong>Email:</strong> {professorEmail}
              </p>
              <p>
                <button onClick={() => router.push("/loginprofessor")}>
                  Sair
                </button>
              </p>
            </div>
          </div>
        </div>

        <section style={{ padding: 24 }}>
          <h2 style={{ color: "#fff", textAlign: "center", marginBottom: 18 }}>
            {turmaSelecionada
              ? `Atividades aplicadas na turma "${turmaSelecionada.nome}"`
              : "Atividades disponíveis para aplicar"}
          </h2>

          {loadingAtividades ? (
            <p style={{ color: "#fff", textAlign: "center" }}>
              Carregando atividades...
            </p>
          ) : (
            <div className={styles.listaAtividadesWrapper}>
              <ul style={{ padding: 0, margin: 0 }}>
                {(turmaSelecionada ? atividadesTurma : atividades).map(
                  (atividade) => (
                    <ActivityItem
                      key={atividade.idAtividade}
                      atividade={atividade}
                    />
                  )
                )}
              </ul>
            </div>
          )}
        </section>

        {/* modal aplicar (preservado) */}
        <div
          className={`${styles.modal} ${
            modalAplicarAberto ? styles.modalActive : ""
          }`}
          role="dialog"
          aria-modal="true"
          aria-hidden={!modalAplicarAberto}
          style={{ display: modalAplicarAberto ? undefined : "none" }}
        >
          {modalAplicarAberto && atividadeParaAplicar && (
            <div className={styles.modalContent}>
              <h2>
                Aplicar &quot;{atividadeParaAplicar!.titulo}&quot; em quais
                turmas?
              </h2>
              {loadingTurmas ? (
                <p>Carregando turmas...</p>
              ) : turmas.length === 0 ? (
                <p>Nenhuma turma disponível.</p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {turmas.map((turma) => {
                    const selected = turmasSelecionadas.includes(turma.idTurma);
                    return (
                      <label
                        key={turma.idTurma}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: selected
                            ? "rgba(0, 188, 212, 0.08)"
                            : "#3a3360",
                          color: "#fff",
                          border: `1px solid ${
                            selected ? "#00bcd4" : "rgba(255,255,255,0.06)"
                          }`,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          name={`turma_${turma.idTurma}`}
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleTurmaSelection(turma.idTurma);
                          }}
                          style={{
                            marginRight: 8,
                            cursor: "pointer",
                            accentColor: "#00bcd4",
                          }}
                        />
                        <span style={{ flex: 1 }}>
                          {turma.nome} ({turma.alunos?.length || 0} alunos)
                        </span>
                      </label>
                    );
                  })}
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button
                      onClick={() => aplicarEmMultiplasTurmas()}
                      disabled={turmasSelecionadas.length === 0 || isApplying}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 8,
                        background:
                          turmasSelecionadas.length > 0 && !isApplying
                            ? "#00bcd4"
                            : "#666",
                        color: "#fff",
                        border: "none",
                        cursor:
                          turmasSelecionadas.length > 0 && !isApplying
                            ? "pointer"
                            : "not-allowed",
                        opacity:
                          turmasSelecionadas.length > 0 && !isApplying
                            ? 1
                            : 0.6,
                      }}
                    >
                      {isApplying
                        ? "Aplicando..."
                        : `Aplicar em ${turmasSelecionadas.length} turma(s)`}
                    </button>
                    <button
                      onClick={fecharModalAplicar}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 8,
                        background: "#b71c1c",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                      }}
                      disabled={isApplying}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* modal criar turma */}
        <div
          className={`${styles.modal} ${
            modalTurmaAberto ? styles.modalActive : ""
          }`}
          role="dialog"
          aria-modal="true"
          aria-hidden={!modalTurmaAberto}
          style={{ display: modalTurmaAberto ? undefined : "none" }}
        >
          {modalTurmaAberto && (
            <div className={styles.modalContent}>
              <h2 style={{ marginBottom: 8 }}>Criar Turma</h2>

              <div style={{ marginTop: 8 }}>
                <label
                  style={{ display: "block", marginBottom: 6, color: "#fff" }}
                >
                  Nome da turma
                </label>
                <input
                  type="text"
                  value={nomeTurma}
                  onChange={(e) => setNomeTurma(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "#fff",
                    color: "#000",
                  }}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <strong style={{ color: "#fff" }}>Alunos</strong>
                {alunos.length === 0 ? (
                  <div style={{ color: "#bdbdda", marginTop: 8 }}>
                    Nenhum aluno adicionado.
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
                    {alunos.map((a, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ color: "#fff" }}>
                          {a.nome} — {a.email}
                        </span>
                        <button
                          className={styles.btn}
                          onClick={() => removerAluno(i)}
                          style={{ background: "#b71c1c", color: "#fff" }}
                          type="button"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {showAlunoForm ? (
                <form onSubmit={adicionarAluno} style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      name="nome"
                      placeholder="Nome"
                      value={formAluno.nome}
                      onChange={handleAlunoChange}
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        background: "#fff",
                        color: "#000",
                      }}
                    />
                    <input
                      name="email"
                      placeholder="Email"
                      value={formAluno.email}
                      onChange={handleAlunoChange}
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        background: "#fff",
                        color: "#000",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      name="senha"
                      placeholder="Senha"
                      value={formAluno.senha}
                      onChange={handleAlunoChange}
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        background: "#fff",
                        color: "#000",
                      }}
                    />
                    <input
                      name="confirmarSenha"
                      placeholder="Confirmar senha"
                      value={formAluno.confirmarSenha}
                      onChange={handleAlunoChange}
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        background: "#fff",
                        color: "#000",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="submit"
                      className={styles.btn}
                      style={{ background: "#00bcd4" }}
                    >
                      Adicionar aluno
                    </button>
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={cancelarAlunoForm}
                      style={{ background: "#b71c1c" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={abrirAlunoForm}
                    style={{ background: "#2196f3", color: "#fff" }}
                  >
                    Adicionar aluno
                  </button>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  className={styles.btn}
                  onClick={criarTurma}
                  disabled={isCreatingTurma}
                  style={{ background: "#4caf50", color: "#fff" }}
                >
                  {isCreatingTurma ? "Criando..." : "Criar Turma"}
                </button>
                <button
                  type="button"
                  className={styles.btnVoltarModal}
                  onClick={fecharModalTurma}
                  style={{ background: "#b71c1c" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {respostaDetalhe && (
          <div
            className={`${styles.modal} ${styles.modalActive}`}
            role="dialog"
            aria-modal="true"
            // garante que este modal fique sobre o modal de desempenho
            style={{ zIndex: 11020 }}
          >
            <div
              className={styles.modalContent}
              style={{ position: "relative", zIndex: 11021 }}
            >
              <h3>
                Resposta de{" "}
                {respostaDetalhe.aluno?.nome ? (
                  <button
                    onClick={() =>
                      // call the helper we attached to window in the effect above
                      // it will open a modal with aluno details
                      void window.openAlunoDetalhes?.(
                        respostaDetalhe.aluno,
                        respostaDetalhe.idAluno
                      )
                    }
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#00bcd4",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "1em",
                    }}
                  >
                    {respostaDetalhe.aluno.nome}
                  </button>
                ) : (
                  respostaDetalhe.idAluno
                )}
              </h3>
              <div
                style={{
                  marginTop: 12,
                  color: "#dcd7ee",
                  whiteSpace: "pre-wrap",
                }}
              >
                {respostaDetalhe.respostaTexto ?? "Sem texto enviado."}
              </div>

              <div style={{ marginTop: 16 }}>
                <strong>Feedback do professor</strong>
                <div
                  style={{
                    marginTop: 8,
                    padding: "12px 16px",
                    background: "#2b2638",
                    borderRadius: 8,
                    color: "#dcd7ee",
                    minHeight: 48,
                  }}
                >
                  {respostaDetalhe.feedback &&
                  respostaDetalhe.feedback.length > 0
                    ? respostaDetalhe.feedback
                    : "Nenhum feedback foi fornecido ainda."}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <button
                  className={styles.btnVoltarModal}
                  onClick={fecharRespostaDetalhe}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {correcaoModalAberto && respostaParaCorrigir && (
          <div
            className={`${styles.modal} ${styles.modalActive}`}
            role="dialog"
            aria-modal="true"
            style={{ zIndex: 11010 }}
          >
            <div
              className={styles.modalContent}
              style={{ position: "relative", zIndex: 11011 }}
            >
              <h3>
                Corrigir resposta —{" "}
                {respostaParaCorrigir.aluno?.nome ??
                  `Aluno ${respostaParaCorrigir.idAluno}`}
              </h3>
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Nota (0-10)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step="0.1"
                  value={notaCorrecao}
                  onChange={(e) =>
                    setNotaCorrecao(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  style={{
                    width: 120,
                    padding: 8,
                    background: "#fff",
                    color: "#000",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Feedback
                </label>
                <textarea
                  rows={6}
                  value={feedbackCorrecao}
                  onChange={(e) => setFeedbackCorrecao(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    background: "#fff",
                    color: "#000",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button
                  className={styles.btn}
                  onClick={enviarCorrecao}
                  disabled={isSubmittingCorrecao}
                  style={{ background: "#4caf50", color: "#fff" }}
                >
                  {isSubmittingCorrecao ? "Salvando..." : "Salvar correção"}
                </button>
                <button
                  className={styles.btn}
                  onClick={() => setCorrecaoModalAberto(false)}
                  style={{ background: "#b71c1c", color: "#fff" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className={`${styles.modal} ${
            modalDesempenhoAberto ? styles.modalActive : ""
          }`}
          // desempenho fica atrás dos modais de resposta/correção
          style={{ zIndex: 10000 }}
        >
          <div
            className={`${styles.modalContent} ${styles.desempenhoModalContent}`}
          >
            <h2>Desempenho da Turma</h2>
            <div style={{ marginTop: 12 }}>
              <strong>Turma:</strong> {turmaSelecionada?.nome ?? "—"}
            </div>

            <div style={{ marginTop: 12 }}>
              {turmaSelecionada ? (
                <>
                  {/* resumo da atividade */}
                  {atividadeDetalhe ? (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 700 }}>
                        {atividadeDetalhe.titulo}
                      </div>
                      <div
                        style={{
                          color: "#dcd7ee",
                          marginTop: 6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {atividadeDetalhe.descricao ?? ""}
                      </div>
                    </div>
                  ) : null}

                  {/* modo unplugged: lista de respostas (segunda tela) */}
                  {desempenhoView === "unplugged" ? (
                    <>
                      {loadingRespostas ? (
                        <div>Carregando respostas...</div>
                      ) : respostas.length === 0 ? (
                        <div>
                          Nenhuma resposta encontrada para esta atividade.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 12 }}>
                          {respostas.map((r) => (
                            <div
                              key={r.idResposta}
                              style={{
                                padding: 12,
                                borderRadius: 8,
                                background: "rgba(0,0,0,0.12)",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700 }}>
                                  {r.aluno?.nome ?? `Aluno ${r.idAluno}`}
                                </div>
                                <div style={{ color: "#cfcce0" }}>
                                  {r.aluno?.email ?? ""}
                                </div>
                                <div style={{ marginTop: 6, color: "#dcd7ee" }}>
                                  {r.respostaTexto ?? ""}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  className={styles.btn}
                                  onClick={() => abrirRespostaDetalhe(r)}
                                >
                                  Ver Resposta
                                </button>
                                <button
                                  className={styles.btn}
                                  onClick={() => abrirModalCorrecao(r)}
                                >
                                  Corrigir
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : // modo plugged: componente existente
                  modalSelectedAtividadeId ? (
                    <DesempenhoAlunos
                      turmaId={turmaSelecionada.idTurma}
                      atividadeId={modalSelectedAtividadeId}
                      dados={[]}
                    />
                  ) : atividadeDetalhe ? (
                    <DesempenhoAlunos
                      turmaId={turmaSelecionada.idTurma}
                      atividadeId={atividadeDetalhe.idAtividade}
                      dados={[]}
                    />
                  ) : (
                    <p>Abra o desempenho a partir de uma atividade.</p>
                  )}
                </>
              ) : (
                <p>Selecione uma turma para ver desempenho.</p>
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                className={styles.btnVoltarModal}
                onClick={() => {
                  setModalDesempenhoAberto(false);
                  setModalSelectedAtividadeId(null);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
