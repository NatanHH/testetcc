export async function fetchWasmBuffer(url: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao buscar wasm: " + res.status);
  return await res.arrayBuffer();
}

export async function instantiateWasmBuffer(
  wasmUrl: string,
  opts: { onEvent?: (v: number) => void } = {}
) {
  const buffer = await fetchWasmBuffer(wasmUrl);
  const memory = new WebAssembly.Memory({ initial: 10, maximum: 100 });

  const imports = {
    env: {
      memory,
      abort(_msgPtr: number, _filePtr: number, _line: number, _col: number) {
        console.error("WASM abort", { _msgPtr, _filePtr, _line, _col });
      },
      emit_event_i(value: number) {
        if (opts.onEvent) opts.onEvent(value);
      },
    },
  };

  const { instance } = await WebAssembly.instantiate(buffer, imports);

  return {
    instance,
    memory,
    callExported(name: string, ...args: any[]) {
      const fn = (instance.exports as any)[name];
      if (typeof fn !== "function")
        throw new Error(`Export '${name}' not found`);
      return fn(...args);
    },
  };
}
