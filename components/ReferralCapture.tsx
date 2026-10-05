"use client";

import { useEffect } from "react";

export default function ReferralCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
    if (code && /^[A-Z0-9_-]{4,48}$/.test(code) && !localStorage.getItem("mocha_referral_code")) {
      localStorage.setItem("mocha_referral_code", code);
      document.cookie = `mocha_referral_code=${encodeURIComponent(code)}; Max-Age=7776000; Path=/; SameSite=Lax; Secure`;
    }
  }, []);
  return null;
}
