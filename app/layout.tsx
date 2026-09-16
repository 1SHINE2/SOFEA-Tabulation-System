// app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Tabulation System | SOFEA",
  description:
    "Official digital tabulation system for SOFEA A.Y. 2026–2027 — University of Cebu Lapu-Lapu and Mandaue.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
