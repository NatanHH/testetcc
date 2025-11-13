// ✅ OTIMIZAÇÃO: Rate limiting para prevenir spam de tentativas
import { NextApiRequest, NextApiResponse } from "next";

type RateLimitStore = Map<string, { count: number; resetTime: number }>;

const store: RateLimitStore = new Map();

interface RateLimitOptions {
  windowMs: number; // janela de tempo em ms
  maxRequests: number; // máximo de requests na janela
}

/**
 * Middleware de rate limiting
 * @param options - Configurações de rate limit
 * @returns função middleware
 */
export function rateLimit(
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 30 }
) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void
  ) => {
    const identifier = getIdentifier(req);
    const now = Date.now();

    // Limpar entradas expiradas
    cleanupExpiredEntries(now);

    const record = store.get(identifier);

    if (!record) {
      // Primeira requisição
      store.set(identifier, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    if (now > record.resetTime) {
      // Janela expirou, resetar
      record.count = 1;
      record.resetTime = now + options.windowMs;
      return next();
    }

    if (record.count >= options.maxRequests) {
      // Limite excedido
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error:
          "Muitas tentativas. Por favor, aguarde antes de tentar novamente.",
        retryAfter,
      });
    }

    // Incrementar contador
    record.count++;
    return next();
  };
}

/**
 * Obtém identificador único do cliente (IP + User Agent)
 */
function getIdentifier(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.socket?.remoteAddress || "unknown";

  const userAgent = req.headers["user-agent"] || "unknown";
  return `${ip}-${userAgent}`;
}

/**
 * Remove entradas expiradas do store (garbage collection)
 */
function cleanupExpiredEntries(now: number) {
  const keysToDelete: string[] = [];

  store.forEach((value, key) => {
    if (now > value.resetTime) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => store.delete(key));
}

/**
 * Helper para usar rate limiting em API routes
 */
export function withRateLimit(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<void | NextApiResponse<unknown>>,
  options?: RateLimitOptions
) {
  const limiter = rateLimit(options);

  return async (req: NextApiRequest, res: NextApiResponse) => {
    return new Promise<void>((resolve, reject) => {
      limiter(req, res, async () => {
        try {
          await handler(req, res);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  };
}
