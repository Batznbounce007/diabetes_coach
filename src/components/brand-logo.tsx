type BrandLogoProps = {
  title?: string;
  subtitle?: string;
};

export function BrandLogo({ title = "CGM Pulse", subtitle }: BrandLogoProps) {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-card shadow-sm">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12h4l2.2-4.2L14 16l2-4h4" />
          <circle cx="12" cy="12" r="9" opacity="0.25" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="text-2xl font-extrabold tracking-tight">{title}</p>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

