export const MARKETPLACE_URL = "https://mocha-coffee-marketplace.vercel.app/";

export type MarketplaceActivity = {
  id: string;
  message: string;
  timestamp: string;
  category: "order" | "batch" | "merchant";
};

export type MarketplaceLiveSnapshot = {
  totalCoffeeSoldKg: number;
  totalRevenueKes: number;
  activeCoffeeBatches: number;
  activeMerchants: number;
  ordersThisWeek: number;
  totalCustomers: number;
  returningCustomers: number;
  coffeeUnderManagementKg: number;
  coffeeAllocatedKg: number;
  activities: MarketplaceActivity[];
  lastSyncedAt: string;
  hasOrderData: boolean;
  degraded?: boolean;
  loadError?: string;
};

type AdminOrder = {
  id: string;
  orderNumber: string;
  orderType: string;
  channel: string;
  customerName: string;
  quantity: number;
  totalAmount: number;
  paymentStatus?: string | null;
  paymentProvider?: string | null;
  mpesaReceiptNumber?: string | null;
  farmName?: string | null;
  merchantName?: string | null;
  createdAt: string;
  fulfillmentStatus?: string;
};

type BatchRecord = {
  id: string;
  batchId: string;
  totalWeight: string | number;
  allocatedWeight: string | number;
  redeemedWeight: string | number;
  status: string;
  updatedAt: string;
  farm?: { name?: string };
};

type MerchantRecord = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
};

type UserRecord = {
  id: string;
  userType: string;
  createdAt: string;
};

const BASE_URL =
  process.env.MARKETPLACE_API_BASE_URL ??
  "https://mocha-coffee-marketplace-backend.vercel.app/api";

const SERVICE_TOKEN = process.env.MARKETPLACE_SERVICE_TOKEN;
const ADMIN_EMAIL = process.env.MARKETPLACE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MARKETPLACE_ADMIN_PASSWORD;

let cachedAuthToken: string | null = null;
let cachedAuthExpiresAt = 0;

const FETCH_TIMEOUT_MS = 12_000;
const FETCH_RETRIES = 2;

const decodeJwtExpiry = (token: string) => {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    ) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
};

const resolveMarketplaceAuthToken = async (): Promise<string | null> => {
  if (SERVICE_TOKEN) return SERVICE_TOKEN;

  const now = Date.now();
  if (cachedAuthToken && cachedAuthExpiresAt > now + 60_000) {
    return cachedAuthToken;
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(`${BASE_URL.replace(/\/$/, "")}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) return null;

    const data = (await response.json()) as { access_token?: string };
    const token = data.access_token?.trim();
    if (!token) return null;

    cachedAuthToken = token;
    cachedAuthExpiresAt = decodeJwtExpiry(token) || now + 6 * 60 * 60 * 1000;
    return token;
  } catch {
    return null;
  }
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const isRevenueRecognizedOrder = (order: AdminOrder) => {
  const paymentStatus = String(order.paymentStatus || "").toLowerCase();
  const paymentProvider = String(order.paymentProvider || "").toLowerCase();
  const mpesaReceipt = String(order.mpesaReceiptNumber || "").trim();
  if (paymentStatus !== "completed") return false;
  if (!paymentProvider) return false;
  if (paymentProvider === "elementpay") return Boolean(mpesaReceipt);
  return true;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async <T>(
  path: string,
  authToken: string | null = null,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<T> => {
  const url = path.startsWith("http")
    ? path
    : `${BASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Marketplace API ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.name === "AbortError"
            ? new Error(`Marketplace API timeout after ${timeoutMs}ms`)
            : error
          : new Error("Marketplace API request failed");
      if (attempt < FETCH_RETRIES - 1) {
        await sleep(400 * (attempt + 1));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Marketplace API request failed");
};

const fetchJsonSafe = async <T>(
  path: string,
  authToken: string | null = null
): Promise<T | null> => {
  try {
    return await fetchJson<T>(path, authToken);
  } catch {
    return null;
  }
};

const formatOrderActivity = (order: AdminOrder): string => {
  const name = order.customerName || "A customer";
  const qty = order.quantity;
  const farm = order.farmName ? ` from ${order.farmName}` : "";

  switch (order.orderType) {
    case "Green Coffee":
      return `${name} purchased ${qty} kg of Green Coffee${farm}`;
    case "Self-Brew Roast":
      return `${name} placed a Self-Brew Roast Order (${qty} kg)${farm}`;
    case "Event Roast":
      return `${order.fulfillmentStatus === "completed" ? "Event Roast Order completed" : `${name} placed an Event Roast Order`}${farm}`;
    case "Merchant Product":
      return `${order.merchantName || "Merchant"} sold ${qty} kg of coffee${order.merchantName ? ` (${order.merchantName})` : ""}`;
    default:
      return `${name} completed marketplace order ${order.orderNumber}`;
  }
};

const formatBatchActivity = (batch: BatchRecord): string | null => {
  const farmName = batch.farm?.name || batch.batchId;
  const allocated = toNumber(batch.allocatedWeight);
  const redeemed = toNumber(batch.redeemedWeight);

  if (redeemed > 0) {
    return `${farmName} batch redemption updated (${redeemed} kg redeemed)`;
  }
  if (allocated > 0) {
    return `${farmName} batch allocation updated (${allocated} kg allocated)`;
  }
  if (batch.status === "available") {
    return `${farmName} coffee batch is live on the marketplace`;
  }
  return null;
};

export const fetchMarketplaceLive = async (): Promise<MarketplaceLiveSnapshot> => {
  const errors: string[] = [];
  const authToken = await resolveMarketplaceAuthToken().catch(() => null);
  if (!authToken && !ADMIN_EMAIL && !ADMIN_PASSWORD && !SERVICE_TOKEN) {
    errors.push("Marketplace admin credentials are not configured");
  } else if (!authToken) {
    errors.push("Marketplace admin login failed");
  }

  const batches =
    (await fetchJsonSafe<BatchRecord[]>("/batches")) ??
    (await fetchJsonSafe<BatchRecord[]>("/batches/available")) ??
    [];

  if (batches.length === 0) {
    errors.push("Batch inventory is temporarily unavailable");
  }

  const coffeeUnderManagementKg = batches.reduce(
    (sum, batch) => sum + toNumber(batch.totalWeight),
    0
  );
  const coffeeAllocatedKg = batches.reduce(
    (sum, batch) => sum + toNumber(batch.allocatedWeight),
    0
  );
  const activeCoffeeBatches = batches.filter((batch) =>
    ["available", "allocated"].includes(String(batch.status).toLowerCase())
  ).length;

  const batchActivities: MarketplaceActivity[] = batches.flatMap((batch) => {
    const message = formatBatchActivity(batch);
    if (!message) return [];
    return [
      {
        id: `batch-${batch.id}`,
        message,
        timestamp: batch.updatedAt,
        category: "batch" as const,
      },
    ];
  });

  let paidOrders: AdminOrder[] = [];
  let merchants: MerchantRecord[] = [];
  let users: UserRecord[] = [];
  let hasOrderData = false;

  if (authToken) {
    const [ordersRes, merchantsRes, usersRes] = await Promise.all([
      fetchJsonSafe<AdminOrder[]>("/orders/admin/list?status=all", authToken),
      fetchJsonSafe<MerchantRecord[]>("/merchants", authToken),
      fetchJsonSafe<UserRecord[]>("/users", authToken),
    ]);

    if (ordersRes && merchantsRes && usersRes) {
      paidOrders = ordersRes.filter(isRevenueRecognizedOrder);
      merchants = merchantsRes.filter(
        (merchant) => String(merchant.status).toLowerCase() === "active"
      );
      users = usersRes.filter((user) => user.userType === "customer");
      hasOrderData = true;
    } else {
      errors.push("Paid order metrics are temporarily unavailable");
    }
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const ordersThisWeek = paidOrders.filter(
    (order) => new Date(order.createdAt).getTime() >= weekAgo
  ).length;

  const totalCoffeeSoldKg = paidOrders.reduce(
    (sum, order) => sum + toNumber(order.quantity),
    hasOrderData ? 0 : coffeeAllocatedKg
  );

  const totalRevenueKes = paidOrders.reduce(
    (sum, order) => sum + toNumber(order.totalAmount),
    0
  );

  const customerOrderCounts = paidOrders.reduce<Record<string, number>>((acc, order) => {
    const key = order.customerName || order.id;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const returningCustomers = Object.values(customerOrderCounts).filter((count) => count >= 2).length;

  const merchantIdsFromOrders = new Set(
    paidOrders
      .filter((order) => order.channel === "merchant" && order.merchantName)
      .map((order) => order.merchantName as string)
  );

  const activeMerchants = hasOrderData
    ? Math.max(merchants.length, merchantIdsFromOrders.size)
    : merchantIdsFromOrders.size;

  const orderActivities: MarketplaceActivity[] = paidOrders.slice(0, 8).map((order) => ({
    id: `order-${order.id}`,
    message: formatOrderActivity(order),
    timestamp: order.createdAt,
    category: "order",
  }));

  const merchantActivities: MarketplaceActivity[] = merchants
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map((merchant) => ({
      id: `merchant-${merchant.id}`,
      message: `New merchant joined the marketplace: ${merchant.name}`,
      timestamp: merchant.createdAt,
      category: "merchant",
    }));

  const activities = [...orderActivities, ...merchantActivities, ...batchActivities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const hasAnyData = batches.length > 0 || hasOrderData;

  return {
    totalCoffeeSoldKg,
    totalRevenueKes,
    activeCoffeeBatches,
    activeMerchants,
    ordersThisWeek,
    totalCustomers: hasOrderData ? users.length : Object.keys(customerOrderCounts).length,
    returningCustomers,
    coffeeUnderManagementKg,
    coffeeAllocatedKg,
    activities,
    lastSyncedAt: new Date().toISOString(),
    hasOrderData,
    degraded: errors.length > 0,
    loadError: hasAnyData ? errors[0] : errors.join("; ") || "Marketplace data unavailable",
  };
};
