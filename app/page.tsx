"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ActivityItem, LiveFarmerProfile } from "@/lib/elementpay";
import type { MarketplaceLiveSnapshot } from "@/lib/marketplace";
import { MARKETPLACE_URL } from "@/lib/marketplace";

const usdToKesRate = 128.2;

const cardClass =
  "rounded-2xl border border-[#e8dfd6] bg-white p-4 shadow-[0_10px_35px_rgba(79,62,45,0.07)]";

const asCurrencyLine = (amount?: number, currency?: string) => {
  if (amount === undefined || !currency) return "";
  if (currency === "USD") return `$${amount.toLocaleString()}`;
  return `${currency} ${amount.toLocaleString()}`;
};

export default function Home() {
  const [phone, setPhone] = useState("+254");
  const [profile, setProfile] = useState<LiveFarmerProfile | null>(null);
  const [marketplace, setMarketplace] = useState<MarketplaceLiveSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarketplaceLoading, setIsMarketplaceLoading] = useState(true);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [error, setError] = useState("");
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutCurrency, setPayoutCurrency] = useState<"KES" | "USD">("KES");
  const [payoutAmount, setPayoutAmount] = useState("0");
  const [farmerPayouts, setFarmerPayouts] = useState<ActivityItem[]>([]);

  const offRampUrl = useMemo(() => {
    if (!profile) return "https://dapp.elementpay.net/";
    const q = new URLSearchParams({
      phone: profile.phone,
      wallet: profile.walletAddress,
      amount: payoutAmount,
      currency: payoutCurrency,
    });
    return `https://dapp.elementpay.net/?${q.toString()}`;
  }, [profile, payoutAmount, payoutCurrency]);

  useEffect(() => {
    let cancelled = false;

    const fetchMarketplace = async () => {
      try {
        const response = await fetch("/api/marketplace-live");
        const data = (await response.json()) as MarketplaceLiveSnapshot & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load marketplace data");
        }
        if (!cancelled) setMarketplace(data);
      } catch {
        if (!cancelled) setMarketplace(null);
      } finally {
        if (!cancelled) setIsMarketplaceLoading(false);
      }
    };

    void fetchMarketplace();
    const interval = setInterval(() => {
      void fetchMarketplace();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const loadProfile = async (phoneNumber: string) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/farmer-profile?phone=${encodeURIComponent(phoneNumber)}`
      );
      const data = (await response.json()) as LiveFarmerProfile & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to load profile");
      }
      setProfile(data);
      setFarmerPayouts(
        (data.activities ?? []).filter((activity) => activity.status === "settled")
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not connect to ElementPay live services."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadProfile(phone);
  };

  useEffect(() => {
    if (!profile?.phone) return;
    const interval = setInterval(() => {
      void loadProfile(profile.phone);
    }, 20000);
    return () => clearInterval(interval);
  }, [profile?.phone]);

  const onLaunchPayout = async () => {
    if (!profile) return;
    const amount = Number(payoutAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payout amount.");
      return;
    }

    setIsSubmittingPayout(true);
    setError("");
    try {
      const response = await fetch("/api/offramp-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: profile.phone,
          walletAddress: profile.walletAddress,
          amount,
          currency: payoutCurrency,
        }),
      });
      const data = (await response.json()) as { launchUrl?: string; error?: string };
      if (!response.ok || !data.launchUrl) {
        throw new Error(data.error || "Unable to initialize off-ramp session.");
      }
      window.open(data.launchUrl, "_blank", "noopener,noreferrer");
    } catch (sessionError) {
      setError(
        sessionError instanceof Error
          ? sessionError.message
          : "Off-ramp connection failed."
      );
      window.open(offRampUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const marketplaceButton = (
    <a
      href={MARKETPLACE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full bg-[#6f4e37] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5a3f2d]"
    >
      Marketplace Live
    </a>
  );

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#2d2218]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 md:px-8">
        <header className="flex items-center justify-between rounded-2xl border border-[#e5d8cb] bg-white px-4 py-3 shadow-[0_10px_30px_rgba(79,62,45,0.06)]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8b6b4a]">
              Project Mocha
            </p>
            <h1 className="text-lg font-semibold sm:text-xl">Farmer Portal</h1>
          </div>
          {marketplaceButton}
        </header>

        <section className={`${cardClass} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8b6b4a]">
                Marketplace overview
              </p>
              <h2 className="mt-2 text-lg font-semibold">Live marketplace activity</h2>
              <p className="mt-1 text-sm text-[#6e5842]">
                Metrics sourced from confirmed marketplace records and coffee batch inventory.
              </p>
            </div>
            <a
              href={MARKETPLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[#6f4e37] underline-offset-2 hover:underline"
            >
              Open marketplace
            </a>
          </div>

          {isMarketplaceLoading && !marketplace ? (
            <p className="mt-4 text-sm text-[#7a6652]">Loading marketplace data...</p>
          ) : marketplace ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <article className="rounded-xl bg-[#faf6f1] p-4">
                  <p className="text-xs uppercase tracking-wider text-[#8b6b4a]">
                    Total Coffee Sold
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {marketplace.totalCoffeeSoldKg.toLocaleString()} kg
                  </p>
                  <p className="text-xs text-[#7a6652]">
                    {marketplace.hasOrderData ? "Paid orders" : "Allocated inventory"}
                  </p>
                </article>
                <article className="rounded-xl bg-[#faf6f1] p-4">
                  <p className="text-xs uppercase tracking-wider text-[#8b6b4a]">
                    Marketplace Revenue
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    KES {marketplace.totalRevenueKes.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#7a6652]">Confirmed payments only</p>
                </article>
                <article className="rounded-xl bg-[#faf6f1] p-4">
                  <p className="text-xs uppercase tracking-wider text-[#8b6b4a]">
                    Active Coffee Batches
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {marketplace.activeCoffeeBatches.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#7a6652]">Available or allocated</p>
                </article>
                <article className="rounded-xl bg-[#faf6f1] p-4">
                  <p className="text-xs uppercase tracking-wider text-[#8b6b4a]">
                    Active Merchants
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {marketplace.activeMerchants.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#7a6652]">Selling on marketplace</p>
                </article>
                <article className="rounded-xl bg-[#faf6f1] p-4">
                  <p className="text-xs uppercase tracking-wider text-[#8b6b4a]">
                    Coffee Under Management
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {marketplace.coffeeUnderManagementKg.toLocaleString()} kg
                  </p>
                  <p className="text-xs text-[#7a6652]">
                    {marketplace.coffeeAllocatedKg.toLocaleString()} kg allocated
                  </p>
                </article>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-[#8b6b4a]">Total Customers</p>
                  <p className="mt-1 text-lg font-semibold">{marketplace.totalCustomers}</p>
                </div>
                <div className="rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-[#8b6b4a]">Returning Customers</p>
                  <p className="mt-1 text-lg font-semibold">{marketplace.returningCustomers}</p>
                </div>
                <div className="rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-[#8b6b4a]">Orders This Week</p>
                  <p className="mt-1 text-lg font-semibold">{marketplace.ordersThisWeek}</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8b6b4a]">
                  Recent marketplace activity
                </p>
                <div className="mt-3 space-y-3 text-sm">
                  {marketplace.activities.length > 0 ? (
                    marketplace.activities.map((activity) => (
                      <div key={activity.id} className="rounded-xl bg-[#faf6f1] p-3">
                        <p>{activity.message}</p>
                        <p className="mt-1 text-xs text-[#7a6652]">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-[#faf6f1] p-3 text-[#7a6652]">
                      No marketplace activity recorded yet.
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-[#7a6652]">
                  Last synced: {new Date(marketplace.lastSyncedAt).toLocaleString()}
                </p>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-[#8a4f1e]">
              Marketplace data is temporarily unavailable. You can still browse the live marketplace.
            </p>
          )}
        </section>

        {!profile ? (
          <section className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            <div className={`${cardClass} p-6`}>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8b6b4a]">
                Mobile-first onboarding
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">
                Track coffee income and off-ramp payouts in minutes.
              </h2>
              <p className="mt-3 text-sm text-[#6e5842]">
                Sign in with your phone number, map your wallet, and monitor
                payments in both KES and USD.
              </p>

              <form className="mt-6 space-y-3" onSubmit={onLogin}>
                <label className="block text-sm font-medium" htmlFor="phone">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-xl border border-[#d8c8bb] bg-[#fdf9f4] px-4 py-3 outline-none focus:border-[#6f4e37]"
                  placeholder="+254 7XX XXX XXX"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-[#6f4e37] px-4 py-3 font-medium text-white"
                >
                  {isLoading ? "Connecting..." : "Continue to dashboard"}
                </button>
              </form>
              {error ? (
                <p className="mt-3 rounded-xl bg-[#fff1e6] px-3 py-2 text-xs text-[#8a4f1e]">
                  {error}
                </p>
              ) : null}
            </div>

            <div className={`${cardClass} p-6`}>
              <p className="text-sm font-medium text-[#6e5842]">
                What this dashboard includes
              </p>
              <ul className="mt-4 space-y-3 text-sm text-[#3f2f22]">
                <li>Live marketplace overview and activity feed</li>
                <li>Farmer wallet mapping via ElementPay</li>
                <li>Confirmed marketplace payment visibility</li>
                <li>Coffee batch and allocation tracking</li>
                <li>ElementPay off-ramp launch flow</li>
              </ul>
              <a
                href={MARKETPLACE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex rounded-xl border border-[#d8c8bb] bg-white px-4 py-3 text-sm font-medium"
              >
                Browse live marketplace
              </a>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            <div className={`${cardClass} p-6`}>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8b6b4a]">
                Farmer profile
              </p>
              <h2 className="mt-2 text-lg font-semibold">Wallet & payouts</h2>
              <p className="mt-1 text-xs text-[#7a6652]">
                Last synced: {new Date(profile.lastSyncedAt).toLocaleString()}
              </p>
              <div className="mt-4 rounded-xl bg-[#f8f3ee] p-4 text-sm">
                <p>
                  <span className="font-medium">Phone:</span> {profile.phone}
                </p>
                <p className="mt-2 break-all">
                  <span className="font-medium">Wallet:</span> {profile.walletAddress}
                </p>
              </div>
              <button
                className="mt-4 w-full rounded-xl border border-[#d8c8bb] bg-white px-4 py-3 text-sm font-medium"
                onClick={() => setShowPayoutModal(true)}
              >
                Open payout modal
              </button>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-xs uppercase tracking-wider text-[#8b6b4a]">
                  Settled payouts
                </p>
                {farmerPayouts.length > 0 ? (
                  farmerPayouts.map((activity) => (
                    <div key={activity.id} className="rounded-xl bg-[#faf6f1] p-3">
                      <p>Off-ramp payout settled</p>
                      <p className="mt-1 text-xs text-[#7a6652]">
                        {[asCurrencyLine(activity.amount, activity.currency), activity.timestamp ? new Date(activity.timestamp).toLocaleString() : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-[#faf6f1] p-3 text-[#7a6652]">
                    No settled payouts yet for this wallet.
                  </div>
                )}
              </div>
            </div>

            <div className={`${cardClass} p-6`}>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8b6b4a]">
                Marketplace connection
              </p>
              <h2 className="mt-2 text-lg font-semibold">Your marketplace link</h2>
              <p className="mt-3 text-sm text-[#6e5842]">
                Marketplace sales, merchant activity, and coffee batch allocations are tracked on
                the live Project Mocha marketplace.
              </p>
              <a
                href={MARKETPLACE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#6f4e37] px-4 py-3 text-sm font-medium text-white"
              >
                Go to live marketplace
              </a>
            </div>
          </section>
        )}
      </main>

      {showPayoutModal && profile ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-3xl border border-[#dbcfc4] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payout via ElementPay</h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="rounded-full border border-[#dbcfc4] px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-[#6e5842]">
              Select amount and launch secure off-ramp flow.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#faf6f1] p-1">
              <button
                onClick={() => setPayoutCurrency("KES")}
                className={`rounded-lg px-3 py-2 text-sm ${
                  payoutCurrency === "KES"
                    ? "bg-white font-medium text-[#4a3728] shadow"
                    : "text-[#7a6652]"
                }`}
              >
                KES
              </button>
              <button
                onClick={() => setPayoutCurrency("USD")}
                className={`rounded-lg px-3 py-2 text-sm ${
                  payoutCurrency === "USD"
                    ? "bg-white font-medium text-[#4a3728] shadow"
                    : "text-[#7a6652]"
                }`}
              >
                USD
              </button>
            </div>

            <label htmlFor="amount" className="mt-4 block text-sm font-medium">
              Amount
            </label>
            <input
              id="amount"
              inputMode="decimal"
              value={payoutAmount}
              onChange={(event) => setPayoutAmount(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dbcfc4] px-4 py-3 outline-none focus:border-[#6f4e37]"
            />
            <div className="mt-3 rounded-xl bg-[#faf6f1] p-3 text-xs text-[#6e5842]">
              Rate: 1 USD = {usdToKesRate} KES
            </div>
            {error ? (
              <p className="mt-3 rounded-xl bg-[#fff1e6] px-3 py-2 text-xs text-[#8a4f1e]">
                {error}
              </p>
            ) : null}
            <button
              onClick={onLaunchPayout}
              disabled={isSubmittingPayout}
              className="mt-4 block w-full rounded-xl bg-[#6f4e37] px-4 py-3 text-center font-medium text-white"
            >
              {isSubmittingPayout
                ? "Starting secure session..."
                : "Continue to ElementPay"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
