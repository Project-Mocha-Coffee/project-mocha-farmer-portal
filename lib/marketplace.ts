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

const fetchJson = async <T>(path: string, auth = false): Promise<T> => {
  const url = path.startsWith("http") ? path : `${BASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(auth && SERVICE_TOKEN ? { Authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
    },
    next: { revalidate: 0 },
  });
  if (!response.ok) {
    throw new Error(`Marketplace API ${response.status}`);
  }
  return (await response.json()) as T;
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
  const batches = await fetchJson<BatchRecord[]>("/batches");

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

  if (SERVICE_TOKEN) {
    try {
      const [ordersRes, merchantsRes, usersRes] = await Promise.all([
        fetchJson<AdminOrder[]>("/orders/admin/list?status=all", true),
        fetchJson<MerchantRecord[]>("/merchants", true),
        fetchJson<UserRecord[]>("/users", true),
      ]);
      paidOrders = ordersRes.filter(isRevenueRecognizedOrder);
      merchants = merchantsRes.filter(
        (merchant) => String(merchant.status).toLowerCase() === "active"
      );
      users = usersRes.filter((user) => user.userType === "customer");
      hasOrderData = true;
    } catch {
      hasOrderData = false;
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
  };
};
