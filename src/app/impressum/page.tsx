import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum"
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Impressum</h1>

      <section className="mt-6 space-y-2 text-sm">
        <h2 className="text-lg font-semibold">Angaben gemäß § 5 TMG</h2>
        <p>Max Mustermann</p>
        <p>Musterstraße 1</p>
        <p>12345 Musterstadt</p>
      </section>

      <section className="mt-6 space-y-2 text-sm">
        <h2 className="text-lg font-semibold">Kontakt</h2>
        <p>E-Mail: max@example.com</p>
      </section>

      <section className="mt-6 space-y-2 text-sm">
        <h2 className="text-lg font-semibold">Haftung für Inhalte</h2>
        <p className="text-muted-foreground">
          Die Inhalte dieser Seite wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
          Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
        </p>
      </section>

      <section className="mt-6 space-y-2 text-sm">
        <h2 className="text-lg font-semibold">Medizinischer Hinweis</h2>
        <p className="text-muted-foreground">
          Diese Anwendung dient der persönlichen Auswertung von CGM-Daten und ersetzt keine
          medizinische Beratung oder Behandlung.
        </p>
      </section>
    </main>
  );
}
