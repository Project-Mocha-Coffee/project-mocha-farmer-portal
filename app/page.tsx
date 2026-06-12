"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { ActivityItem, LiveFarmerProfile } from "@/lib/elementpay";
import type { MarketplaceLiveSnapshot } from "@/lib/marketplace";
import { MARKETPLACE_URL } from "@/lib/marketplace";
import {
  INVESTOR_PORTAL_URL,
  cardClass,
  inputClass,
  labelClass,
  outlineButtonClass,
  paymentButtonClass,
  primaryButtonClass,
  statCardClass,
  surfaceClass,
} from "@/lib/design";

const usdToKesRate = 128.2;

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

  return (
    <div className="min-h-screen bg-[#fafafa] text-[var(--charcoal)]">
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-[var(--jungle-green-border)] bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex h-[76px] max-w-[1680px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-10">
          <a
            href={INVESTOR_PORTAL_URL}
            className="relative block h-10 w-36 shrink-0 sm:h-11 sm:w-40"
            aria-label="Project Mocha home"
          >
            <Image
              src="/Brand/project mocha_brown.svg"
              alt="Project Mocha"
              fill
              className="object-contain object-left"
              priority
            />
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            <a
              href={INVESTOR_PORTAL_URL}
              className="rounded-full px-4 py-2 text-sm font-medium tracking-wide text-gray-600 transition hover:bg-gray-50 hover:text-[#202d07]"
            >
              Investor Portal
            </a>
            <span className="rounded-full bg-[var(--jungle-green-surface)] px-4 py-2 text-sm font-medium tracking-wide text-[#202d07]">
              Farmer Portal
            </span>
            <a
              href={MARKETPLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-4 py-2 text-sm font-medium tracking-wide text-gray-600 transition hover:bg-gray-50 hover:text-[#202d07]"
            >
              Marketplace
            </a>
          </nav>

          <a
            href={MARKETPLACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${primaryButtonClass} px-4 py-2 text-sm md:hidden`}
          >
            Marketplace
          </a>
          <a
            href={MARKETPLACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${primaryButtonClass} hidden px-5 py-2.5 text-sm md:inline-flex`}
          >
            Marketplace Live
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1680px] flex-col gap-8 px-4 pt-[92px] pb-10 sm:px-6 lg:px-8 xl:px-10">
        <section className={cardClass}>
          <div className="border-b border-[var(--jungle-green-border)] bg-[var(--jungle-green-surface)] px-5 py-5 sm:px-6">
            <p className={labelClass}>Marketplace overview</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--charcoal)] sm:text-3xl">
              Live marketplace activity
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Metrics sourced from confirmed marketplace records and coffee batch inventory.
            </p>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            {isMarketplaceLoading && !marketplace ? (
              <p className="text-sm text-gray-500">Loading marketplace data...</p>
            ) : marketplace ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    {
                      label: "Total Coffee Sold",
                      value: `${marketplace.totalCoffeeSoldKg.toLocaleString()} kg`,
                      hint: marketplace.hasOrderData ? "Paid orders" : "Allocated inventory",
                    },
                    {
                      label: "Marketplace Revenue",
                      value: `KES ${marketplace.totalRevenueKes.toLocaleString()}`,
                      hint: "Confirmed payments only",
                    },
                    {
                      label: "Active Coffee Batches",
                      value: marketplace.activeCoffeeBatches.toLocaleString(),
                      hint: "Available or allocated",
                    },
                    {
                      label: "Active Merchants",
                      value: marketplace.activeMerchants.toLocaleString(),
                      hint: "Selling on marketplace",
                    },
                    {
                      label: "Coffee Under Management",
                      value: `${marketplace.coffeeUnderManagementKg.toLocaleString()} kg`,
                      hint: `${marketplace.coffeeAllocatedKg.toLocaleString()} kg allocated`,
                    },
                  ].map((stat) => (
                    <article key={stat.label} className={statCardClass}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#202d07]">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{stat.hint}</p>
                    </article>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Total Customers", value: marketplace.totalCustomers },
                    { label: "Returning Customers", value: marketplace.returningCustomers },
                    { label: "Orders This Week", value: marketplace.ordersThisWeek },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-[#202d07]/10 bg-white px-4 py-3 shadow-sm"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        {item.label}
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-[#202d07]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className={labelClass}>Recent marketplace activity</p>
                  <div className="mt-3 space-y-3 text-sm">
                    {marketplace.activities.length > 0 ? (
                      marketplace.activities.map((activity) => (
                        <div key={activity.id} className={`${surfaceClass} p-3`}>
                          <p className="text-[var(--charcoal)]">{activity.message}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className={`${surfaceClass} p-3 text-gray-500`}>
                        No marketplace activity recorded yet.
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Last synced: {new Date(marketplace.lastSyncedAt).toLocaleString()}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#522912]">
                Marketplace data is temporarily unavailable. You can still browse the live
                marketplace.
              </p>
            )}
          </div>
        </section>

        {!profile ? (
          <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className={cardClass}>
              <div className="border-b border-[var(--jungle-green-border)] bg-[var(--jungle-green-surface)] px-5 py-5 sm:px-6">
                <p className={labelClass}>Mobile-first onboarding</p>
                <h2 className="mt-1 text-2xl font-bold text-[var(--charcoal)] sm:text-3xl">
                  Track coffee income and off-ramp payouts in minutes.
                </h2>
              </div>
              <div className="space-y-4 p-5 sm:p-6">
                <p className="text-sm text-gray-600">
                  Sign in with your phone number, map your wallet, and monitor payments in both
                  KES and USD.
                </p>

                <form className="space-y-3" onSubmit={onLogin}>
                  <label className="block text-sm font-medium text-[var(--charcoal)]" htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={inputClass}
                    placeholder="+254 7XX XXX XXX"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`${primaryButtonClass} w-full px-4 py-3.5 text-sm disabled:opacity-60`}
                  >
                    {isLoading ? "Connecting..." : "Continue to dashboard"}
                  </button>
                </form>
                {error ? (
                  <p className="rounded-xl bg-[#fff1e6] px-3 py-2 text-xs text-[#522912]">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>

            <div className={`${cardClass} p-5 sm:p-6`}>
              <p className="text-sm font-medium text-gray-600">What this dashboard includes</p>
              <ul className="mt-4 space-y-3 text-sm text-[var(--charcoal)]">
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
                className={`${outlineButtonClass} mt-6 inline-flex px-4 py-3 text-sm`}
              >
                Browse live marketplace
              </a>
            </div>
          </section>
        ) : (
          <>
            <section className={cardClass}>
              <div className="border-b border-[var(--jungle-green-border)] bg-[var(--jungle-green-surface)] px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={labelClass}>Your wallet</p>
                    <h2 className="mt-1 text-2xl font-bold text-[var(--charcoal)] sm:text-3xl">
                      Balances & coffee income
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Live data from ElementPay for {profile.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfile(null);
                      setFarmerPayouts([]);
                      setError("");
                    }}
                    className={`${outlineButtonClass} px-4 py-2 text-sm`}
                  >
                    Sign out
                  </button>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: "KES Balance",
                      value: `KES ${profile.balanceKes.toLocaleString()}`,
                      hint: "Available wallet balance",
                    },
                    {
                      label: "USD Balance",
                      value: `$${profile.balanceUsd.toLocaleString()}`,
                      hint: "Available wallet balance",
                    },
                    {
                      label: "Coffee Sales",
                      value: `KES ${profile.totalCoffeeSalesKes.toLocaleString()}`,
                      hint: `$${profile.totalCoffeeSalesUsd.toLocaleString()} USD equivalent`,
                    },
                    {
                      label: "Marketplace Payments",
                      value: `KES ${profile.marketplacePaymentsKes.toLocaleString()}`,
                      hint: `$${profile.marketplacePaymentsUsd.toLocaleString()} USD received`,
                    },
                  ].map((stat) => (
                    <article key={stat.label} className={statCardClass}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#202d07]">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{stat.hint}</p>
                    </article>
                  ))}
                </div>

                {profile.activities.length > 0 ? (
                  <div>
                    <p className={labelClass}>Recent wallet activity</p>
                    <div className="mt-3 space-y-3 text-sm">
                      {profile.activities.slice(0, 6).map((activity) => (
                        <div key={activity.id} className={`${surfaceClass} p-3`}>
                          <p className="text-[var(--charcoal)]">
                            {activity.label || "Wallet transaction"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {[
                              asCurrencyLine(activity.amount, activity.currency),
                              activity.status,
                              activity.timestamp
                                ? new Date(activity.timestamp).toLocaleString()
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className={cardClass}>
              <div className="border-b border-[var(--jungle-green-border)] bg-[var(--jungle-green-surface)] px-5 py-5 sm:px-6">
                <p className={labelClass}>Farmer profile</p>
                <h2 className="mt-1 text-lg font-bold text-[var(--charcoal)]">Wallet & payouts</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Last synced: {new Date(profile.lastSyncedAt).toLocaleString()}
                </p>
              </div>
              <div className="space-y-4 p-5 sm:p-6">
                <div className={`${surfaceClass} p-4 text-sm`}>
                  <p>
                    <span className="font-medium">Phone:</span> {profile.phone}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs">
                    <span className="font-medium font-sans">Wallet:</span> {profile.walletAddress}
                  </p>
                </div>
                <button
                  className={`${outlineButtonClass} w-full px-4 py-3 text-sm`}
                  onClick={() => setShowPayoutModal(true)}
                >
                  Open payout modal
                </button>
                <div className="space-y-2 text-sm">
                  <p className={labelClass}>Settled payouts</p>
                  {farmerPayouts.length > 0 ? (
                    farmerPayouts.map((activity) => (
                      <div key={activity.id} className={`${surfaceClass} p-3`}>
                        <p>Off-ramp payout settled</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {[
                            asCurrencyLine(activity.amount, activity.currency),
                            activity.timestamp
                              ? new Date(activity.timestamp).toLocaleString()
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className={`${surfaceClass} p-3 text-gray-500`}>
                      No settled payouts yet for this wallet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-5 sm:p-6`}>
              <p className={labelClass}>Marketplace connection</p>
              <h2 className="mt-2 text-lg font-bold text-[var(--charcoal)]">Your marketplace link</h2>
              <p className="mt-3 text-sm text-gray-600">
                Marketplace sales, merchant activity, and coffee batch allocations are tracked on
                the live Project Mocha marketplace.
              </p>
              <a
                href={MARKETPLACE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${primaryButtonClass} mt-4 inline-flex w-full items-center justify-center px-4 py-3 text-sm`}
              >
                Go to live marketplace
              </a>
            </div>
          </section>
          </>
        )}
      </main>

      <footer className="border-t border-[var(--jungle-green-border)] bg-white py-6">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-3 px-4 text-sm text-gray-600 sm:px-6 lg:px-8 xl:px-10">
          <p>Project Mocha Farmer Portal</p>
          <div className="flex flex-wrap gap-4">
            <a href={INVESTOR_PORTAL_URL} className="hover:text-[#202d07]">
              Investor Portal
            </a>
            <a
              href={MARKETPLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#202d07]"
            >
              Marketplace
            </a>
            <a href="https://www.projectmocha.com/" className="hover:text-[#202d07]">
              projectmocha.com
            </a>
          </div>
        </div>
      </footer>

      {showPayoutModal && profile ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-2xl border border-[var(--jungle-green-border)] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--charcoal)]">Payout via ElementPay</h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className={`${outlineButtonClass} px-3 py-1 text-sm`}
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Select amount and launch secure off-ramp flow. Approve the ElementPay
              contract to spend tokens before your first payout.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-full border border-[#202d07]/15 bg-[var(--jungle-green-surface)] p-1">
              {(["KES", "USD"] as const).map((currency) => (
                <button
                  key={currency}
                  onClick={() => setPayoutCurrency(currency)}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    payoutCurrency === currency
                      ? "bg-[#202d07] font-medium text-white"
                      : "text-gray-600"
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>

            <label htmlFor="amount" className="mt-4 block text-sm font-medium">
              Amount
            </label>
            <input
              id="amount"
              inputMode="decimal"
              value={payoutAmount}
              onChange={(event) => setPayoutAmount(event.target.value)}
              className={`${inputClass} mt-2`}
            />
            <div className={`${surfaceClass} mt-3 p-3 text-xs text-gray-600`}>
              Rate: 1 USD = {usdToKesRate} KES
            </div>
            {error ? (
              <p className="mt-3 rounded-xl bg-[#fff1e6] px-3 py-2 text-xs text-[#522912]">
                {error}
              </p>
            ) : null}
            <button
              onClick={onLaunchPayout}
              disabled={isSubmittingPayout}
              className={`${paymentButtonClass} mt-4 block w-full px-4 py-3.5 text-center text-sm disabled:opacity-60`}
            >
              {isSubmittingPayout ? "Starting secure session..." : "Continue to ElementPay"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
