"use client";

import { useMemo, useState } from "react";

type ShareEmailPanelProps = {
  subject: string;
  body: string;
  lang: "de" | "en";
};

export function ShareEmailPanel({ subject, body, lang }: ShareEmailPanelProps) {
  const [recipient, setRecipient] = useState("");
  const t =
    lang === "de"
      ? {
          placeholder: "z. B. arzt@praxis.de",
          action: "Per E-Mail teilen"
        }
      : {
          placeholder: "e.g. doctor@clinic.com",
          action: "Share via email"
        };

  const mailtoHref = useMemo(() => {
    const params = new URLSearchParams({
      subject,
      body
    });
    const to = recipient.trim();
    return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
  }, [recipient, subject, body]);

  return (
    <div className="space-y-3">
      <input
        type="email"
        value={recipient}
        onChange={(event) => setRecipient(event.target.value)}
        placeholder={t.placeholder}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
      />

      <a
        href={mailtoHref}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        {t.action}
      </a>
    </div>
  );
}
