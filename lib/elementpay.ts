export type Currency = "KES" | "USD";

export type ActivityItem = {
  id: string;
  label: string;
  amount?: number;
  currency?: Currency;
  timestamp?: string;
  status?: string;
};

export type LiveFarmerProfile = {
  phone: string;
  walletAddress: string;
  tokenizedTrees: number;
  totalCoffeeSalesUsd: number;
  totalCoffeeSalesKes: number;
  balanceUsd: number;
  balanceKes: number;
  marketplacePaymentsUsd: number;
  marketplacePaymentsKes: number;
  activities: ActivityItem[];
  isLive: boolean;
  lastSyncedAt: string;
};

type OffRampSessionInput = {
  phone: string;
  walletAddress: string;
  amount: number;
  currency: Currency;
};

type JsonRecord = Record<string, unknown>;

const BASE_URL = process.env.ELEMENTPAY_API_BASE_URL;
const API_KEY = process.env.ELEMENTPAY_API_KEY;
const PHONE_WALLET_PATH =
  process.env.ELEMENTPAY_PHONE_WALLET_PATH ?? "/v1/wallets/resolve-phone";
const METRICS_PATH = process.env.ELEMENTPAY_METRICS_PATH ?? "/v1/farmer/metrics";
const TRANSACTIONS_PATH =
  process.env.ELEMENTPAY_TRANSACTIONS_PATH ?? "/v1/farmer/transactions";
const OFFRAMP_PATH = process.env.ELEMENTPAY_OFFRAMP_PATH ?? "/v1/offramp/session";

const ensureBaseUrl = () => {
  if (!BASE_URL) {
    throw new Error(
      "Missing ELEMENTPAY_API_BASE_URL. Add ElementPay API config to deploy real data."
    );
  }
  return BASE_URL.replace(/\/$/, "");
};

const headers = () => ({
  "Content-Type": "application/json",
  ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
});

const toNumber = (value: unknown, fallback: number | undefined = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const pick = (obj: JsonRecord, keys: string[]) => {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers(),
      ...(init?.headers ?? {}),
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElementPay API ${response.status}: ${body || "Unknown error"}`);
  }

  return (await response.json()) as T;
};

const normalizeActivities = (payload: unknown): ActivityItem[] => {
  if (!Array.isArray(payload)) return [];
  return payload.slice(0, 10).map((raw, index) => {
    const item = (raw ?? {}) as JsonRecord;
    const amount = toNumber(
      pick(item, ["amount", "value", "grossAmount", "netAmount"]),
      undefined
    );
    const currency = String(
      pick(item, ["currency", "fiatCurrency", "settlementCurrency"]) ?? ""
    ).toUpperCase();
    return {
      id: String(pick(item, ["id", "reference", "txHash", "uuid"]) ?? index),
      label: String(
        pick(item, ["label", "description", "type", "title"]) ?? "Activity"
      ),
      amount,
      currency: currency === "USD" ? "USD" : currency === "KES" ? "KES" : undefined,
      status: String(pick(item, ["status", "state"]) ?? ""),
      timestamp: String(
        pick(item, ["timestamp", "createdAt", "updatedAt", "date"]) ?? ""
      ),
    };
  });
};

export const fetchLiveFarmerProfile = async (
  phone: string
): Promise<LiveFarmerProfile> => {
  const baseUrl = ensureBaseUrl();

  const walletResponse = await fetchJson<JsonRecord>(
    `${baseUrl}${PHONE_WALLET_PATH}?phone=${encodeURIComponent(phone)}`
  );

  const walletAddress = String(
    pick(walletResponse, ["walletAddress", "wallet", "address", "accountAddress"]) ??
      ""
  );

  if (!walletAddress) {
    throw new Error("ElementPay response missing wallet address for this phone.");
  }

  const [metricsResponse, transactionsResponse] = await Promise.all([
    fetchJson<JsonRecord>(
      `${baseUrl}${METRICS_PATH}?phone=${encodeURIComponent(
        phone
      )}&wallet=${encodeURIComponent(walletAddress)}`
    ),
    fetchJson<JsonRecord>(
      `${baseUrl}${TRANSACTIONS_PATH}?phone=${encodeURIComponent(
        phone
      )}&wallet=${encodeURIComponent(walletAddress)}`
    ),
  ]);

  return {
    phone,
    walletAddress,
    tokenizedTrees: toNumber(
      pick(metricsResponse, ["tokenizedTrees", "treesCount", "treeTokens"])
    ),
    totalCoffeeSalesUsd: toNumber(
      pick(metricsResponse, ["totalCoffeeSalesUsd", "coffeeSalesUsd", "salesUsd"])
    ),
    totalCoffeeSalesKes: toNumber(
      pick(metricsResponse, ["totalCoffeeSalesKes", "coffeeSalesKes", "salesKes"])
    ),
    balanceUsd: toNumber(
      pick(metricsResponse, ["balanceUsd", "walletBalanceUsd", "availableUsd"])
    ),
    balanceKes: toNumber(
      pick(metricsResponse, ["balanceKes", "walletBalanceKes", "availableKes"])
    ),
    marketplacePaymentsUsd: toNumber(
      pick(metricsResponse, [
        "marketplacePaymentsUsd",
        "paymentsUsd",
        "settledPaymentsUsd",
      ])
    ),
    marketplacePaymentsKes: toNumber(
      pick(metricsResponse, [
        "marketplacePaymentsKes",
        "paymentsKes",
        "settledPaymentsKes",
      ])
    ),
    activities: normalizeActivities(
      pick(transactionsResponse, ["items", "transactions", "results", "data"])
    ),
    isLive: true,
    lastSyncedAt: new Date().toISOString(),
  };
};

export const createOffRampSession = async (
  payload: OffRampSessionInput
): Promise<{ launchUrl: string }> => {
  const baseUrl = ensureBaseUrl();

  const response = await fetchJson<JsonRecord>(`${baseUrl}${OFFRAMP_PATH}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const launchUrl = String(
    pick(response, ["launchUrl", "url", "redirectUrl", "sessionUrl"]) ?? ""
  );

  if (!launchUrl) {
    const fallback = new URL("https://dapp.elementpay.net/");
    fallback.searchParams.set("phone", payload.phone);
    fallback.searchParams.set("wallet", payload.walletAddress);
    fallback.searchParams.set("amount", String(payload.amount));
    fallback.searchParams.set("currency", payload.currency);
    return { launchUrl: fallback.toString() };
  }

  return { launchUrl };
};
