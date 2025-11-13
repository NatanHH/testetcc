export function withTimeout<T>(p: Promise<T>, ms = 5000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error("timeout")), ms)
  );
  return Promise.race([p, timeoutPromise]);
}
