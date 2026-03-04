import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Me",
  description: "Warum ich diese Seite erstellt habe"
};

export default function AboutMePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">About Me</h1>

      <section className="mt-6 space-y-3 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Warum ich diese Seite erstellt habe</p>
        <p>
          Ich habe diese Seite gebaut, weil ich meine CGM-Daten nicht nur sehen, sondern wirklich
          verstehen und gezielt nutzen will, um jeden Tag besser mit Diabetes umzugehen.
        </p>
        <p>
          Mein Ziel ist klar: mehr Time in Range, weniger starke Schwankungen und konkrete
          Coaching-Impulse, die im Alltag mit CGM, Pumpe und Closed-Loop wirklich helfen.
        </p>
      </section>
    </main>
  );
}
