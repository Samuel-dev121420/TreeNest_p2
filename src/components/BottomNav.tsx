import { Link, useLocation } from "@tanstack/react-router";
import { Images, Sprout, Home, Users, User } from "lucide-react";

const items = [
  { to: "/treegallery", label: "TreeGallery", icon: Images },
  { to: "/grow", label: "Grow", icon: Sprout },
  { to: "/friend-club", label: "Friend Club", icon: Users },
  { to: "/account", label: "Account", icon: User },
] as const;

export function BottomNav() {
  const location = useLocation();

  if (location.pathname === "/login" || location.pathname === "/admin") {
    return null;
  }

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-4">
      <div className="pointer-events-auto relative flex w-full max-w-md items-end justify-between gap-1 rounded-3xl border border-border/60 bg-card/85 px-3 pb-2 pt-2 shadow-float backdrop-blur-md sm:max-w-lg">
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <Link
          to="/"
          aria-label="Home"
          className="group -mt-8 flex shrink-0 flex-col items-center gap-1"
          activeProps={{ "data-active": "true" }}
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-gradient-leaf text-primary-foreground shadow-float ring-4 ring-card transition-transform group-hover:scale-105 group-active:scale-95">
            <Home className="size-7" strokeWidth={2.2} />
          </span>
          <span className="text-[11px] font-semibold text-foreground">Home</span>
        </Link>

        {items.slice(2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-muted-foreground transition-colors hover:text-foreground"
      activeProps={{ className: "text-primary" }}
    >
      <Icon className="size-5" strokeWidth={2} />
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </Link>
  );
}
