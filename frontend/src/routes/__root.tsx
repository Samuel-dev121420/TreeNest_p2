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
    // Error logged to console
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
import { GlobalStudyTimerBar } from "../components/GlobalStudyTimerBar";
import { NotificationCenterWidget } from "../components/NotificationCenterWidget";
import { TopHeaderBanner } from "../components/TopHeaderBanner";
import { ShieldAlert, LogOut } from "lucide-react";

function AppShell() {
  const { user, profile, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const searchObj = location.search as { visit?: string };
  const isVisiting = location.pathname === "/" && Boolean(searchObj?.visit);
  const isChatRoute = location.pathname.startsWith("/chat");
  const isMinimalRoute =
    location.pathname === "/login" || location.pathname === "/admin" || isChatRoute;

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

  // Online Presence Tracking & Heartbeat, and Incoming Message Delivery Sync
  useEffect(() => {
    if (!user || !profile) return;

    let heartbeatTimer: NodeJS.Timeout | null = null;

    Promise.all([
      import("../lib/firestore-service"),
      import("../lib/chat-service"),
    ]).then(([{ updateOnlineStatus, pingPresence }, { markAllIncomingAsDelivered }]) => {
      // Set online when app loads and sync incoming delivered messages
      updateOnlineStatus(user.uid, true);
      markAllIncomingAsDelivered(user.uid);

      // Heartbeat ping every 25 seconds to keep presence fresh even in background tabs
      heartbeatTimer = setInterval(() => {
        pingPresence(user.uid);
        markAllIncomingAsDelivered(user.uid);
      }, 25000);

      const handleOnline = () => {
        updateOnlineStatus(user.uid, true);
        markAllIncomingAsDelivered(user.uid);
      };

      const handleVisibilityChange = () => {
        // Refresh ping immediately when tab becomes visible again
        if (document.visibilityState === "visible") {
          pingPresence(user.uid);
          markAllIncomingAsDelivered(user.uid);
        }
        // NOTE: Sengaja TIDAK mengubah status menjadi offline saat tab hidden / background!
        // User yang membuka TreeNest di tab background atau aplikasi lain tetap berstatus online.
      };

      const handleUnload = () => {
        updateOnlineStatus(user.uid, false);
      };

      window.addEventListener("online", handleOnline);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("beforeunload", handleUnload);
      window.addEventListener("pagehide", handleUnload);

      return () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        window.removeEventListener("online", handleOnline);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("beforeunload", handleUnload);
        window.removeEventListener("pagehide", handleUnload);
        updateOnlineStatus(user.uid, false);
      };
    });

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    };
  }, [user, profile]);

  if (loading) {
    return <LoadingScreen message="Menghubungkan ke TreeNest..." />;
  }

  // Tampilan Akun Ditangguhkan (Suspended Guard)
  if (profile?.isSuspended && location.pathname !== "/login" && location.pathname !== "/admin") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-amber-50 dark:from-zinc-950 dark:to-neutral-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-red-200 dark:border-red-900/50 p-6 md:p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-baloo">Akun Ditangguhkan</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Akses akun Anda ke TreeNest telah dinonaktifkan sementara oleh Administrator.
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 rounded-2xl p-4 text-left space-y-1.5">
            <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Alasan Penangguhan:</span>
            <p className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">
              {profile.suspendReason || "Pelanggaran pedoman komunitas atau aktivitas mencurigakan."}
            </p>
            {profile.suspendedAt && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                Waktu: {new Date(profile.suspendedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Jika Anda merasa ini adalah kekeliruan, silakan hubungi tim administrator TreeNest.
          </p>

          <button
            onClick={() => logout()}
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Akun
          </button>
        </div>
      </div>
    );
  }

  const isPublicRoute = location.pathname === "/login" || location.pathname === "/admin";

  return (
    <>
      <GlobalStudyTimerBar />
      {!isPublicRoute && <TopHeaderBanner />}
      {!isPublicRoute && <NotificationCenterWidget />}
      {!isPublicRoute && <DailyQuestWidget />}
      <main className="w-full flex-1 overflow-x-hidden">
        <Outlet />
      </main>
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
