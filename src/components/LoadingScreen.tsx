import { Sprout, TreePine } from "lucide-react";

export function LoadingScreen({ message = "Menghubungkan ke TreeNest..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-4">
      {/* Soft background ambient blur circles */}
      <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-leaf-soft/20 blur-3xl" />

      {/* Main Glass Card Container */}
      <div className="relative flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-card/85 p-8 shadow-float backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
        {/* Animated Sprout Icon with Leaf Gradient */}
        <div className="relative flex size-20 items-center justify-center rounded-3xl bg-gradient-leaf text-primary-foreground shadow-float ring-4 ring-card animate-bounce">
          <Sprout className="size-10 stroke-[2.5]" />
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-sun text-foreground shadow-xs">
            <TreePine className="size-3" />
          </span>
        </div>

        {/* Brand Title */}
        <h2 className="mt-5 text-xl font-extrabold text-foreground tracking-tight">
          Tree<span className="text-primary">Nest</span>
        </h2>

        {/* Loading Message */}
        <p className="mt-1.5 text-xs font-semibold text-muted-foreground">{message}</p>

        {/* Elegant Animated Progress Bar */}
        <div className="mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-secondary/80">
          <div className="h-full w-full origin-left bg-gradient-leaf animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}
