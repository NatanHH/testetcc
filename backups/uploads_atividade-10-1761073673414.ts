
/* Auto-injected by server */
export const ALTERNATIVAS: string[] = ["0","1","2"];
export const CORRECT_INDEX: i32 = 1;


// example-atividade-com-resposta.as
// Exemplo de script AssemblyScript para uma atividade PLUGGED.
// - O servidor INJETA antes da compilação:
//     export const ALTERNATIVAS: string[] = ["A", "B", "C"];
//     export const CORRECT_INDEX: i32 = 1;
//   (não coloque essas linhas no campo do ADM — o servidor fará a injeção)
// - Este módulo usa a importação `emit_event_i(i32)` para comunicar eventos ao host.
// - Exporta:
//     start(): inicializa a atividade
//     onChoice(idx: i32): registra escolha do aluno (chamado pelo host quando o aluno clica)
//     checkAnswer(idx: i32): retorna 1 se correta, 0 se incorreta (host pode chamar e gravar resultado)
//     getCorrectIndex(): retorna o índice correto (útil para debug/preview pelo professor)

declare function emit_event_i(value: i32): void; // import do host

// O servidor vai injetar:
// export const ALTERNATIVAS: string[] = [ "Texto A", "Texto B", "Texto C" ];
// export const CORRECT_INDEX: i32 = 1;

let lastChoice: i32 = -1;

export function start(): void {
  // Notifica host: número de alternativas (código 10x + count)
  emit_event_i(10 + ALTERNATIVAS.length as i32);
  // também notifica para indicar início (código 1)
  emit_event_i(1);
}

export function onChoice(idx: i32): void {
  // registra localmente
  lastChoice = idx;
  // notifica host que o aluno escolheu (código 200 + idx)
  emit_event_i(200 + idx);
}

export function checkAnswer(idx: i32): i32 {
  // compara com o índice correto injetado
  if (idx == CORRECT_INDEX) {
    // emite evento especial indicando acerto (1000 + idx)
    emit_event_i(1000 + idx);
    return 1;
  } else {
    // emite evento indicando erro (2000 + idx)
    emit_event_i(2000 + idx);
    return 0;
  }
}

// utilitário para debug/preview
export function getCorrectIndex(): i32 {
  return CORRECT_INDEX;
}

// opcional: host pode chamar para submeter a última escolha registrada
export function submitLastChoice(): i32 {
  if (lastChoice < 0) return -1;
  return checkAnswer(lastChoice);
}