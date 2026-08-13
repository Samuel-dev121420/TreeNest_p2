import { type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="pointer-events-none flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/50 p-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <p className="mt-4 font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-[16rem] text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
