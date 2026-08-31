import { Loader2 } from "lucide-react";

export function LoadingScreen({ message = "Menghubungkan ke TreeNest..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-4">
      {/* Soft background ambient blur circles */}
      <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-leaf-soft/20 blur-3xl" />

      {/* Main Glass Card Container */}
      <div className="relative flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-card/85 p-8 shadow-float backdrop-blur-md animate-in fade-in zoom-in-95 duration-300 min-w-[240px]">
        {/* Google-style Smooth Circular Spinner */}
        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <svg className="size-8 animate-spin text-primary" viewBox="0 0 50 50">
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="opacity-20"
            />
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray="90"
              strokeDashoffset="35"
              strokeLinecap="round"
              className="opacity-90"
            />
          </svg>
        </div>

        {/* Brand Title */}
        <h2 className="mt-4 text-xl font-extrabold text-foreground tracking-tight">
          Tree<span className="text-primary">Nest</span>
        </h2>

        {/* Loading Message */}
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

