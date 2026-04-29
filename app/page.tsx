"use client";

import { FormEvent, useMemo, useState } from "react";

type FarmerProfile = {
  phone: string;
  walletAddress: string;
  tokenizedTrees: number;
  totalCoffeeSalesUsd: number;
  totalCoffeeSalesKes: number;
  balanceUsd: number;
  balanceKes: number;
  marketplacePaymentsUsd: number;
  marketplacePaymentsKes: number;
};

const usdToKesRate = 128.2;

const makeWalletAddress = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  const seeded = digits.padEnd(24, "0").slice(0, 24);
  return `0xmocha${seeded}`.slice(0, 28);
};

const cardClass =
  "rounded-2xl border border-[#e7e5f5] bg-white p-4 shadow-[0_10px_35px_rgba(42,33,94,0.07)]";

export default function Home() {
  const [phone, setPhone] = useState("+254");
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutCurrency, setPayoutCurrency] = useState<"KES" | "USD">("KES");
  const [payoutAmount, setPayoutAmount] = useState("0");

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

  const onLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const walletAddress = makeWalletAddress(phone);
    setProfile({
      phone,
      walletAddress,
      tokenizedTrees: 1240,
      totalCoffeeSalesUsd: 41250,
      totalCoffeeSalesKes: 5288250,
      balanceUsd: 7860,
      balanceKes: 1007652,
      marketplacePaymentsUsd: 18350,
      marketplacePaymentsKes: 2352470,
    });
  };

  return (
    <div className="min-h-screen bg-[#f6f5fd] text-[#181725]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 md:px-8">
        <header className="flex items-center justify-between rounded-2xl border border-[#e5e2fa] bg-white px-4 py-3 shadow-[0_10px_30px_rgba(42,33,94,0.06)]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#7f78b6]">
              Project Mocha
            </p>
            <h1 className="text-lg font-semibold sm:text-xl">Farmer Portal</h1>
          </div>
          <button className="rounded-full bg-[#4f31df] px-4 py-2 text-sm font-medium text-white">
            Marketplace Live
          </button>
        </header>

        {!profile ? (
          <section className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            <div className={`${cardClass} p-6`}>
              <p className="text-xs uppercase tracking-[0.2em] text-[#7f78b6]">
                Mobile-first onboarding
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">
                Track coffee income and off-ramp payouts in minutes.
              </h2>
              <p className="mt-3 text-sm text-[#5d587f]">
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
                  className="w-full rounded-xl border border-[#d8d4f0] bg-[#fbfaff] px-4 py-3 outline-none focus:border-[#4f31df]"
                  placeholder="+254 7XX XXX XXX"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#4f31df] px-4 py-3 font-medium text-white"
                >
                  Continue to dashboard
                </button>
              </form>
              <p className="mt-3 text-xs text-[#6c6890]">
                Reown AppKit evaluation: enabled for future social wallet and
                passkey fallback.
              </p>
            </div>

            <div className={`${cardClass} p-6`}>
              <p className="text-sm font-medium text-[#5d587f]">
                What this dashboard includes
              </p>
              <ul className="mt-4 space-y-3 text-sm text-[#302b54]">
                <li>Total coffee sales overview</li>
                <li>KES/USD balance tracking</li>
                <li>Marketplace payment visibility</li>
                <li>Tokenized tree progress</li>
                <li>ElementPay off-ramp launch flow</li>
              </ul>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className={cardClass}>
                <p className="text-xs uppercase tracking-wider text-[#7f78b6]">
                  Total Coffee Sales
                </p>
                <p className="mt-2 text-xl font-semibold">
                  ${profile.totalCoffeeSalesUsd.toLocaleString()}
                </p>
                <p className="text-sm text-[#686187]">
                  KES {profile.totalCoffeeSalesKes.toLocaleString()}
                </p>
              </article>
              <article className={cardClass}>
                <p className="text-xs uppercase tracking-wider text-[#7f78b6]">
                  Current Balance
                </p>
                <p className="mt-2 text-xl font-semibold">
                  ${profile.balanceUsd.toLocaleString()}
                </p>
                <p className="text-sm text-[#686187]">
                  KES {profile.balanceKes.toLocaleString()}
                </p>
              </article>
              <article className={cardClass}>
                <p className="text-xs uppercase tracking-wider text-[#7f78b6]">
                  Marketplace Payments
                </p>
                <p className="mt-2 text-xl font-semibold">
                  ${profile.marketplacePaymentsUsd.toLocaleString()}
                </p>
                <p className="text-sm text-[#686187]">
                  KES {profile.marketplacePaymentsKes.toLocaleString()}
                </p>
              </article>
              <article className={cardClass}>
                <p className="text-xs uppercase tracking-wider text-[#7f78b6]">
                  Tokenized Trees
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {profile.tokenizedTrees.toLocaleString()}
                </p>
                <p className="text-sm text-[#686187]">Linked to your profile</p>
              </article>
            </section>

            <section className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
              <div className={`${cardClass} p-6`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[#7f78b6]">
                  Farmer profile
                </p>
                <h2 className="mt-2 text-lg font-semibold">Wallet onboarding</h2>
                <div className="mt-4 rounded-xl bg-[#f7f5ff] p-4 text-sm">
                  <p>
                    <span className="font-medium">Phone:</span> {profile.phone}
                  </p>
                  <p className="mt-2 break-all">
                    <span className="font-medium">Wallet:</span>{" "}
                    {profile.walletAddress}
                  </p>
                </div>
                <button
                  className="mt-4 w-full rounded-xl border border-[#d8d4f0] bg-white px-4 py-3 text-sm font-medium"
                  onClick={() => setShowPayoutModal(true)}
                >
                  Open payout modal
                </button>
              </div>

              <div className={`${cardClass} p-6`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[#7f78b6]">
                  Real-time marketplace visibility
                </p>
                <h2 className="mt-2 text-lg font-semibold">Recent activity</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl bg-[#f8f7ff] p-3">
                    Payment settled: Cherry Lot #A12 - $1,430
                  </div>
                  <div className="rounded-xl bg-[#f8f7ff] p-3">
                    Payout ready: KES 56,000 to M-Pesa
                  </div>
                  <div className="rounded-xl bg-[#f8f7ff] p-3">
                    Tokenized trees synced: +48 this week
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {showPayoutModal && profile ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-3xl border border-[#d9d6ee] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payout via ElementPay</h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="rounded-full border border-[#d9d6ee] px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-[#5d587f]">
              Select amount and launch secure off-ramp flow.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#f8f7ff] p-1">
              <button
                onClick={() => setPayoutCurrency("KES")}
                className={`rounded-lg px-3 py-2 text-sm ${
                  payoutCurrency === "KES"
                    ? "bg-white font-medium text-[#2f2861] shadow"
                    : "text-[#6c6792]"
                }`}
              >
                KES
              </button>
              <button
                onClick={() => setPayoutCurrency("USD")}
                className={`rounded-lg px-3 py-2 text-sm ${
                  payoutCurrency === "USD"
                    ? "bg-white font-medium text-[#2f2861] shadow"
                    : "text-[#6c6792]"
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
              className="mt-2 w-full rounded-xl border border-[#d9d6ee] px-4 py-3 outline-none focus:border-[#4f31df]"
            />
            <div className="mt-3 rounded-xl bg-[#f8f7ff] p-3 text-xs text-[#5d587f]">
              Rate: 1 USD = {usdToKesRate} KES
            </div>

            <a
              href={offRampUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block w-full rounded-xl bg-[#4f31df] px-4 py-3 text-center font-medium text-white"
            >
              Continue to ElementPay
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
