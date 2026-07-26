// xd
/**
 * Wallbit Public API client — https://developer.wallbit.io/docs
 * Auth: X-API-Key header via WALLBIT_API_KEY (never commit the key).
 */

const DEFAULT_BASE = "https://api.wallbit.io/api/public/v1";

function getBaseUrl(): string {
  const mcp = process.env.WALLBIT_MCP_URL;
  if (mcp?.includes("wallbit")) {
    return process.env.WALLBIT_API_BASE_URL || DEFAULT_BASE;
  }
  return process.env.WALLBIT_API_BASE_URL || DEFAULT_BASE;
}

function getApiKey(): string {
  const key = process.env.WALLBIT_API_KEY;
  if (!key) {
    throw new Error("WALLBIT_API_KEY no configurada");
  }
  return key;
}

export class WallbitApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "WallbitApiError";
    this.status = status;
    this.body = body;
  }
}

async function wallbitRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-Key": getApiKey(),
      ...(options.headers as Record<string, string>),
    },
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new WallbitApiError(
      `Wallbit API error ${res.status}`,
      res.status,
      data
    );
  }

  return data as T;
}

export async function getCheckingBalance() {
  return wallbitRequest<{ balance?: number; currency?: string }>(
    "/balance/checking"
  );
}

export async function getExchangeRate(from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  return wallbitRequest<{ rate?: number }>(`/rates?${params.toString()}`);
}

export async function listWallbitTransactions(query?: {
  page?: number;
  limit?: number;
  status?: string;
  currency?: string;
}) {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.limit) params.set("limit", String(query.limit));
  if (query?.status) params.set("status", query.status);
  if (query?.currency) params.set("currency", query.currency);
  const qs = params.toString();
  return wallbitRequest<unknown>(`/transactions${qs ? `?${qs}` : ""}`);
}

export async function getCryptoWallets() {
  return wallbitRequest<unknown>("/wallets");
}

/** Bolivia BOB payouts are processed manually / via Wallbit app — record intent only. */
export async function recordWithdrawalIntent(_payload: {
  amountBOB: number;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: true; note: string }> {
  return {
    ok: true,
    note:
      "Retiro registrado en Hubio. La API pública de Wallbit no expone payout BOB automatizado; un admin procesa vía Wallbit y marca completado.",
  };
}

export function isWallbitConfigured(): boolean {
  return Boolean(process.env.WALLBIT_API_KEY);
}
