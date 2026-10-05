import type { Metadata } from "next";
import "./globals.css";
import ReferralCapture from "@/components/ReferralCapture";

export const metadata: Metadata = {
  title: "Project Mocha Farmer Portal",
  description:
    "Register, request verification, and manage farm intelligence, production, coffee, finances, assets, receivables, and loans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#fafafa] text-[var(--charcoal)]">
        <ReferralCapture />
        {children}
      </body>
    </html>
  );
}
