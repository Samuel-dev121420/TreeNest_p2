import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";

export function ToolCard({
  to,
  title,
  description,
  icon: Icon,
  color,
  showBadge = false,
  tagLabel,
  statusText,
}: {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: "leaf" | "sky" | "sun" | "wood";
  showBadge?: boolean;
  tagLabel?: string;
  statusText?: string;
}) {
  const cardStyles = {
    leaf: {
      card: "bg-card/95 hover:bg-card border-emerald-500/30 hover:border-emerald-500/70 hover:shadow-emerald-500/10 dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:border-emerald-500/30 dark:hover:border-emerald-400/60 dark:hover:shadow-emerald-950/40",
      tag: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300 border border-emerald-500/20",
      icon: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white dark:from-emerald-400 dark:to-teal-500 dark:text-slate-950 shadow-md shadow-emerald-500/20",
      link: "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
    },
    sky: {
      card: "bg-card/95 hover:bg-card border-emerald-500/30 hover:border-emerald-500/70 hover:shadow-emerald-500/10 dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:border-emerald-500/30 dark:hover:border-emerald-400/60 dark:hover:shadow-emerald-950/40",
      tag: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300 border border-emerald-500/20",
      icon: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white dark:from-emerald-400 dark:to-teal-500 dark:text-slate-950 shadow-md shadow-emerald-500/20",
      link: "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
    },
    sun: {
      card: "bg-card/95 hover:bg-card border-emerald-500/30 hover:border-emerald-500/70 hover:shadow-emerald-500/10 dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:border-emerald-500/30 dark:hover:border-emerald-400/60 dark:hover:shadow-emerald-950/40",
      tag: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300 border border-emerald-500/20",
      icon: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white dark:from-emerald-400 dark:to-teal-500 dark:text-slate-950 shadow-md shadow-emerald-500/20",
      link: "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
    },
    wood: {
      card: "bg-card/95 hover:bg-card border-emerald-500/30 hover:border-emerald-500/70 hover:shadow-emerald-500/10 dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:border-emerald-500/30 dark:hover:border-emerald-400/60 dark:hover:shadow-emerald-950/40",
      tag: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300 border border-emerald-500/20",
      icon: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white dark:from-emerald-400 dark:to-teal-500 dark:text-slate-950 shadow-md shadow-emerald-500/20",
      link: "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
    },
  };

  const style = cardStyles[color];

  return (
    <Link
      to={to}
      className={`group relative flex flex-col justify-between rounded-3xl border ${style.card} p-5 sm:p-6 shadow-soft backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl active:scale-[0.98] select-none`}
    >
      {/* Dynamic pulse / active badge */}
      {showBadge && (
        <span className="absolute right-3 top-3 size-3 rounded-full bg-destructive animate-ping" />
      )}

      <div>
        {/* Header Tag & Icon */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div
            className={`flex size-12 items-center justify-center rounded-2xl ${style.icon} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}
          >
            <Icon className="size-6" strokeWidth={2.2} />
          </div>

          {tagLabel && (
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${style.tag}`}
            >
              {tagLabel}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h2 className="text-lg sm:text-xl font-bold text-foreground transition-colors group-hover:text-primary">
          {title}
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* Footer Area: Live Status & Interactive CTA */}
      <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between gap-2">
        {statusText ? (
          <span className="text-[11px] font-semibold text-muted-foreground/90 truncate">
            {statusText}
          </span>
        ) : (
          <span />
        )}

        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${style.link} bg-secondary/40 group-hover:bg-secondary transition-all`}
        >
          <span>Buka</span>
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
