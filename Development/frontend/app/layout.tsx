import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: {
    default: "ClauseGuard",
    template: "%s · ClauseGuard",
  },
  description: "Lease checker for tenants in Ireland.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ie" className={`${figtree.variable} ${fraunces.variable}`}>
      <body className="min-h-screen">
        <AuthProvider>{children}</AuthProvider>
        </body>
    </html>
  );
}