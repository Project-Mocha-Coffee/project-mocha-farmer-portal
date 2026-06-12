import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Mocha Farmer Portal",
  description:
    "Track coffee sales, marketplace activity, and off-ramp payouts for Project Mocha farmers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#fafafa] text-[var(--charcoal)]">
        {children}
      </body>
    </html>
  );
}
