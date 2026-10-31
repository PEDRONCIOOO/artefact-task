import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Tasks — Next.js 15 + tRPC",
  description: "Simple in-memory task manager (Artefact written case)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>
          <ToastProvider>
            <header className="header">
              <Link href="/" className="brand">Tasks</Link>
              <nav>
                <Link href="/tasks/new" className="btn btn-primary">+ New task</Link>
              </nav>
            </header>
            <main className="container">{children}</main>
          </ToastProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
