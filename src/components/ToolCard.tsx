import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";

export function ToolCard({
  to,
  title,
  description,
  icon: Icon,
  color,
  showBadge = false,
}: {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: "leaf" | "sky" | "sun" | "wood";
  showBadge?: boolean;
}) {
  const gradients = {
    leaf: "from-leaf/20 to-leaf-soft/30",
    sky: "from-sky/25 to-sky-deep/30",
    sun: "from-sun/25 to-sun/10",
    wood: "from-wood/20 to-soil/20",
  };

  const iconColors = {
    leaf: "text-leaf",
    sky: "text-sky-deep",
    sun: "text-wood",
    wood: "text-soil",
  };

  return (
    <Link
      to={to}
      className={`group relative flex flex-col justify-between rounded-3xl border border-border/70 bg-gradient-to-br ${gradients[color]} p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-float`}
    >
      {showBadge && (
        <span className="absolute right-4 top-4 size-3 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
      )}
      <div>
        <div
          className={`mb-3 flex size-11 items-center justify-center rounded-2xl bg-card/80 ${iconColors[color]}`}
        >
          <Icon className="size-6" strokeWidth={2} />
        </div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-foreground/70 transition-colors group-hover:text-foreground">
        Buka <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
