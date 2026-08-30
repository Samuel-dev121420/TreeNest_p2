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
  const cardStyles = {
    leaf: {
      card: "bg-gradient-to-br from-emerald-100/95 via-emerald-50/85 to-teal-100/95 border-2 border-emerald-400/70 shadow-md shadow-emerald-500/10 dark:from-emerald-950/85 dark:via-slate-950/80 dark:to-teal-950/85 dark:border-emerald-500/40 dark:shadow-emerald-950/50",
      icon: "bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-400/40 shadow-sm",
      link: "text-emerald-700 dark:text-emerald-400",
    },
    sky: {
      card: "bg-gradient-to-br from-sky-100/95 via-sky-50/85 to-blue-100/95 border-2 border-sky-400/70 shadow-md shadow-sky-500/10 dark:from-sky-950/85 dark:via-slate-950/80 dark:to-blue-950/85 dark:border-sky-500/40 dark:shadow-sky-950/50",
      icon: "bg-sky-500 text-white dark:bg-sky-500/20 dark:text-sky-300 dark:border dark:border-sky-400/40 shadow-sm",
      link: "text-sky-700 dark:text-sky-400",
    },
    sun: {
      card: "bg-gradient-to-br from-amber-100/95 via-amber-50/85 to-yellow-100/95 border-2 border-amber-400/70 shadow-md shadow-amber-500/10 dark:from-amber-950/85 dark:via-slate-950/80 dark:to-amber-950/85 dark:border-amber-500/40 dark:shadow-amber-950/50",
      icon: "bg-amber-500 text-white dark:bg-amber-500/20 dark:text-amber-300 dark:border dark:border-amber-400/40 shadow-sm",
      link: "text-amber-700 dark:text-amber-400",
    },
    wood: {
      card: "bg-gradient-to-br from-purple-100/95 via-fuchsia-50/85 to-violet-100/95 border-2 border-purple-400/70 shadow-md shadow-purple-500/10 dark:from-purple-950/85 dark:via-slate-950/80 dark:to-violet-950/85 dark:border-purple-500/40 dark:shadow-purple-950/50",
      icon: "bg-purple-600 text-white dark:bg-purple-500/20 dark:text-purple-300 dark:border dark:border-purple-400/40 shadow-sm",
      link: "text-purple-700 dark:text-purple-400",
    },
  };

  const style = cardStyles[color];

  return (
    <Link
      to={to}
      className={`group relative flex flex-col justify-between rounded-3xl ${style.card} p-6 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg active:scale-95`}
    >
      {showBadge && (
        <span className="absolute right-4 top-4 size-3 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
      )}
      <div>
        <div
          className={`mb-3 flex size-11 items-center justify-center rounded-2xl ${style.icon} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="size-6" strokeWidth={2} />
        </div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className={`mt-4 flex items-center gap-1 text-sm font-semibold ${style.link} transition-colors group-hover:text-foreground`}>
        Buka <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
