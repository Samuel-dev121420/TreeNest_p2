import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "../components/BottomNav";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { LoadingScreen } from "../components/LoadingScreen";
import { motion, AnimatePresence } from "framer-motion";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TreeNest" },
      {
        name: "description",
        content: "Ruang tenang untuk tumbuh bersama pohonmu.",
      },
      { name: "author", content: "TreeNest" },
      { property: "og:title", content: "TreeNest" },
      {
        property: "og:description",
        content: "Ruang tenang untuk tumbuh bersama pohonmu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { DailyQuestWidget } from "../components/DailyQuestWidget";
import { DateTimeWidget } from "../components/DateTimeWidget";
import { GlobalStudyTimerBar } from "../components/GlobalStudyTimerBar";
import { NotificationCenterWidget } from "../components/NotificationCenterWidget";
import { SoundToggleWidget } from "../components/SoundToggleWidget";

function AppShell() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const searchObj = location.search as { visit?: string };
  const isVisiting = location.pathname === "/" && Boolean(searchObj?.visit);
  const isMinimalRoute = location.pathname === "/login" || location.pathname === "/admin";

  useEffect(() => {
    if (!loading) {
      const isPublicRoute = location.pathname === "/login" || location.pathname === "/admin";
      if ((!user || !profile) && !isPublicRoute) {
        navigate({ to: "/login" });
      } else if (user && profile && location.pathname === "/login") {
        navigate({ to: "/" });
      }
    }
  }, [loading, user, profile, location.pathname, navigate]);

  // Scroll to top on normal route change, unless a scroll restoration is scheduled
  useEffect(() => {
    const restoreScrollStr =
      typeof window !== "undefined" ? sessionStorage.getItem("treenest_restore_scroll") : null;
    if (restoreScrollStr === null) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [location.pathname]);

  if (loading) {
    return <LoadingScreen message="Menghubungkan ke TreeNest..." />;
  }

  const isHome = location.pathname === "/";

  return (
    <>
      <GlobalStudyTimerBar />
      {!isVisiting && !isMinimalRoute && <NotificationCenterWidget />}
      {!isVisiting && !isMinimalRoute && <SoundToggleWidget />}
      {/* Page Transition Motion Wrapper — EXCLUDE Home Page (instant render) */}
      {isHome ? (
        <Outlet />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.982 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.982 }}
            transition={{
              duration: 0.40,
              ease: [0.16, 1, 0.3, 1], // Gentle, smooth iOS/macOS style easing
            }}
            className="w-full flex-1 overflow-x-hidden"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      )}
      {!isVisiting && !isMinimalRoute && <DateTimeWidget />}
      {!isVisiting && !isMinimalRoute && <DailyQuestWidget />}
      {!isMinimalRoute && <BottomNav />}
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}
