import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function ToolHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <Link
        to="/grow"
        className="mt-0.5 flex shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-card p-2.5 text-muted-foreground shadow-soft transition-all hover:scale-105 hover:border-primary/50 hover:bg-primary/10 hover:text-primary active:scale-95 cursor-pointer dark:border-border/60 dark:bg-card dark:hover:border-primary/50 dark:hover:bg-primary/20 dark:hover:text-primary"
        aria-label="Kembali ke Grow"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
