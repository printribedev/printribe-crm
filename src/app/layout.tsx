import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Printribe CRM",
  description: "Operations CRM for Printribe",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
