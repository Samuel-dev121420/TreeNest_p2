import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-soft pb-32">
      <div className="mx-auto w-full max-w-3xl px-5 pt-10">
        <header className="animate-grow-in">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function ComingSoon({ note }: { note: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft">
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
