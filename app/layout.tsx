// app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOFEA Digital Tabulation System | UCLM CTE",
  description:
    "Official digital tabulation system for SOFEA — College of Teacher Education, University of Cebu Lapu-Lapu and Mandaue.",
  icons: {
    icon: "/logos/cte-logo.jpg",
    shortcut: "/logos/cte-logo.jpg",
    apple: "/logos/cte-logo.jpg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/jpeg" href="/logos/cte-logo.jpg" />
        <link rel="shortcut icon" href="/logos/cte-logo.jpg" />
        <link rel="apple-touch-icon" href="/logos/cte-logo.jpg" />
      </head>
      <body>{children}</body>
    </html>
  );
}

