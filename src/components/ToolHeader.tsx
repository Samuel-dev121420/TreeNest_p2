import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function ToolHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <Link
        to="/grow"
        className="mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-card p-2 text-muted-foreground shadow-soft transition-colors hover:text-foreground"
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
