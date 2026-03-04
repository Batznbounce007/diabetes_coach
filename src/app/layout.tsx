import type { Metadata } from "next";
import Link from "next/link";
import { ChunkErrorReloader } from "@/components/chunk-error-reloader";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Diabetes Insights",
  description: "CGM analytics and daily insights"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ChunkErrorReloader />
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-border/60 px-6 py-4 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-3">
              <span>Made with ❤ by an diabetic</span>
              <span aria-hidden="true">|</span>
              <Link href="/impressum" className="underline">
                Impressum
              </Link>
              <span aria-hidden="true">|</span>
              <Link href="/about-me" className="underline">
                About Me
              </Link>
            </div>
            <p className="mt-2 text-xs">
              Medizinischer Hinweis: Dieses Angebot ersetzt niemals den Besuch beim Diabetologen
              und dient ausschließlich zur Unterstützung der Therapie.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
