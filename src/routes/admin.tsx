import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllGalleryVideosAdmin,
  moderateVideo,
  deleteGalleryVideoAdmin,
  clearAllVideoHistoryAdmin,
  getUserProfile,
  getAllUsersAdmin,
  suspendUserAdmin,
  unsuspendUserAdmin,
  deleteUserAdmin,
  getSystemMetricsAdmin,
  type UserProfile,
} from "@/lib/firestore-service";
import {
  ShieldCheck,
  Check,
  X,
  Clock,
  Video,
  ArrowLeft,
  LogOut,
  Trash2,
  Play,
  Film,
  ExternalLink,
  AlertTriangle,
  Users,
  Search,
  UserX,
  UserCheck,
  Activity,
  BarChart3,
  TreePine,
  LogIn,
  Flame,
  ShieldAlert,
  RotateCcw,
  Loader2,
  Sparkles,
  RefreshCw,
  Eye,
  Info,
} from "lucide-react";
import { youtubeId, fetchTikTokThumbnail, timeAgo, type GalleryVideo } from "@/lib/social";
import { resolveVideoUrl } from "@/lib/video-storage";

export const Route = createFileRoute("/admin")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { from?: string | undefined; scroll?: number | undefined } => ({
    from: typeof search["from"] === "string" ? search["from"] : undefined,
    scroll: typeof search["scroll"] === "number" ? search["scroll"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Panel Admin — TreeNest Control Center" },
      {
        name: "description",
        content: "Panel khusus Admin untuk memantau pengguna, mengelola status akun, dan memoderasi konten.",
      },
    ],
  }),
  component: AdminDashboardPage,
});

type MainTab = "users" | "gallery" | "metrics";

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { from: searchFrom, scroll: searchScroll } = Route.useSearch();
  const returnPath =
    searchFrom ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("treenest_admin_return_path")
      : null) ||
    "/";

  const { profile, logout } = useAuth();
  const adminUid = profile?.uid || "admin";

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<MainTab>("users");

  // Users Management State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "suspended" | "admin">("all");
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserProfile | null>(null);
  const [userVideos, setUserVideos] = useState<GalleryVideo[]>([]);
  const [loadingUserVideos, setLoadingUserVideos] = useState(false);

  // Suspend / Action modals
  const [suspendingUser, setSuspendingUser] = useState<UserProfile | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [unsuspendingUser, setUnsuspendingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // TreeGallery Moderation State
  const [videos, setVideos] = useState<GalleryVideo[]>([]);
  const [uploaderProfiles, setUploaderProfiles] = useState<Record<string, UserProfile>>({});
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [galleryFilter, setGalleryFilter] = useState<"pending" | "history">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [previewVideo, setPreviewVideo] = useState<GalleryVideo | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);

  // Metrics State
  const [metrics, setMetrics] = useState<{
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    totalVideos: number;
    pendingVideos: number;
    approvedVideos: number;
  } | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useScrollLock(
    Boolean(
      suspendingUser ||
        unsuspendingUser ||
        deletingUser ||
        selectedUserDetail ||
        rejectingId ||
        approvingId ||
        previewVideo ||
        showClearHistoryModal ||
        deletingVideoId,
    ),
  );

  const loadUsersData = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await getAllUsersAdmin();
      setUsers(data);
    } catch (err) {
      console.error("Error loading users for admin:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadVideosData = useCallback(async (currentFilter = galleryFilter) => {
    setLoadingVideos(true);
    try {
      const data = await getAllGalleryVideosAdmin(currentFilter);
      setVideos(data);
      const uniqueUids = Array.from(new Set(data.map((v) => v.uid).filter(Boolean)));
      const profiles = await Promise.all(uniqueUids.map((u) => getUserProfile(u)));
      const map: Record<string, UserProfile> = {};
      profiles.forEach((p) => {
        if (p?.uid) map[p.uid] = p;
      });
      setUploaderProfiles(map);
    } catch (err) {
      console.error("Error loading videos for admin:", err);
    } finally {
      setLoadingVideos(false);
    }
  }, [galleryFilter]);

  const loadMetricsData = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const data = await getSystemMetricsAdmin();
      setMetrics(data);
    } catch (err) {
      console.error("Error loading system metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    loadUsersData();
    loadVideosData();
    loadMetricsData();
  }, [loadUsersData, loadVideosData, loadMetricsData]);

  useEffect(() => {
    if (profile?.themePreference === "dark") {
      document.documentElement.classList.add("dark");
    } else if (profile?.themePreference === "light") {
      document.documentElement.classList.remove("dark");
    }
  }, [profile?.themePreference]);

  function handleBack() {
    if (typeof window !== "undefined") {
      const savedScroll =
        searchScroll !== undefined
          ? searchScroll
          : Number(sessionStorage.getItem("treenest_admin_return_scroll") || 0);

      if (savedScroll > 0) {
        sessionStorage.setItem("treenest_restore_scroll", String(savedScroll));
      }
      sessionStorage.removeItem("treenest_admin_return_path");
      sessionStorage.removeItem("treenest_admin_return_scroll");
    }
    navigate({ to: returnPath });
  }

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Status filter
      if (userStatusFilter === "active" && u.isSuspended) return false;
      if (userStatusFilter === "suspended" && !u.isSuspended) return false;
      if (userStatusFilter === "admin" && u.role !== "admin") return false;

      // Search query
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase().trim();
      const nameMatch = (u.username || "").toLowerCase().includes(q);
      const accMatch = (u.accountId || "").toLowerCase().includes(q);
      const emailMatch = (u.email || "").toLowerCase().includes(q);
      return nameMatch || accMatch || emailMatch;
    });
  }, [users, userStatusFilter, userSearch]);

  // User Actions
  async function handleConfirmSuspend(e: React.FormEvent) {
    e.preventDefault();
    if (!suspendingUser) return;
    setIsProcessingAction(true);
    try {
      await suspendUserAdmin(suspendingUser.uid, suspendReason.trim(), adminUid);
      setSuspendingUser(null);
      setSuspendReason("");
      await loadUsersData();
      await loadMetricsData();
    } finally {
      setIsProcessingAction(false);
    }
  }

  async function handleConfirmUnsuspend() {
    if (!unsuspendingUser) return;
    setIsProcessingAction(true);
    try {
      await unsuspendUserAdmin(unsuspendingUser.uid);
      setUnsuspendingUser(null);
      await loadUsersData();
      await loadMetricsData();
    } finally {
      setIsProcessingAction(false);
    }
  }

  async function handleConfirmDeleteUser() {
    if (!deletingUser) return;
    setIsProcessingAction(true);
    try {
      await deleteUserAdmin(deletingUser.uid);
      setDeletingUser(null);
      if (selectedUserDetail?.uid === deletingUser.uid) {
        setSelectedUserDetail(null);
      }
      await loadUsersData();
      await loadMetricsData();
    } finally {
      setIsProcessingAction(false);
    }
  }

  // Load user uploaded videos for detail view
  const handleOpenUserDetail = async (u: UserProfile) => {
    setSelectedUserDetail(u);
    setLoadingUserVideos(true);
    try {
      const allHist = await getAllGalleryVideosAdmin("history");
      const userVids = allHist.filter((v) => v.uid === u.uid);
      setUserVideos(userVids);
    } catch {
      setUserVideos([]);
    } finally {
      setLoadingUserVideos(false);
    }
  };

  // TreeGallery Actions
  function handleGalleryFilterChange(newFilter: "pending" | "history") {
    setGalleryFilter(newFilter);
    loadVideosData(newFilter);
  }

  async function handleApproveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!approvingId) return;
    const target = videos.find((v) => v.id === approvingId);
    await moderateVideo(approvingId, "approved", approvalComment.trim(), target?.uid, target?.title);
    setApprovingId(null);
    setApprovalComment("");
    loadVideosData();
    loadMetricsData();
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingId) return;
    const target = videos.find((v) => v.id === rejectingId);
    await moderateVideo(rejectingId, "rejected", rejectReason, target?.uid, target?.title);
    setRejectingId(null);
    setRejectReason("");
    loadVideosData();
    loadMetricsData();
  }

  async function confirmDeleteVideo() {
    if (!deletingVideoId) return;
    await deleteGalleryVideoAdmin(deletingVideoId);
    setDeletingVideoId(null);
    loadVideosData();
    loadMetricsData();
  }

  async function handleClearAllHistory() {
    await clearAllVideoHistoryAdmin();
    setShowClearHistoryModal(false);
    loadVideosData("history");
    loadMetricsData();
  }

  return (
    <main className="min-h-screen bg-gradient-soft text-foreground pb-20 select-none">
      {/* Header Admin */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 dark:border-border/60 dark:bg-card/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-soft transition-all hover:bg-secondary hover:border-primary/50 hover:text-primary active:scale-95 cursor-pointer dark:border-border/70 dark:bg-secondary/40 dark:text-foreground dark:hover:bg-secondary/90 dark:hover:border-primary/50 dark:hover:text-primary"
              title={returnPath !== "/" ? "Kembali ke Halaman Sebelumnya" : "Kembali ke Beranda"}
            >
              <ArrowLeft className="size-4" />
              <span>Kembali</span>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold leading-none text-foreground">Admin Control Center</h1>
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                    PRO
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Admin: <span className="font-semibold text-foreground/90">{profile?.username}</span> ({profile?.accountId})
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadUsersData();
                loadVideosData();
                loadMetricsData();
              }}
              title="Refresh Data"
              className="flex items-center justify-center size-9 rounded-2xl border border-border/80 bg-card text-muted-foreground hover:text-primary hover:border-primary/50 transition-all active:scale-95 cursor-pointer shadow-soft"
            >
              <RefreshCw className="size-4" />
            </button>
            <button
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
              className="flex items-center gap-1.5 rounded-2xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-bold text-destructive shadow-soft transition-all hover:bg-destructive hover:text-white hover:border-destructive active:scale-95 cursor-pointer dark:border-destructive/40 dark:bg-destructive/20 dark:text-red-300 dark:hover:bg-destructive dark:hover:text-white dark:hover:border-destructive"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Main Tab Navigation */}
        <div className="mb-6 flex gap-1.5 sm:gap-2 rounded-2xl border border-border/70 bg-card p-1 shadow-soft">
          {[
            { key: "users", label: "Manajemen Pengguna" },
            {
              key: "gallery",
              label: "Moderasi TreeGallery",
              badge: videos.filter((v) => v.status === "pending").length,
            },
            { key: "metrics", label: "Statistik & Metrik" },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as MainTab)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span className="truncate">{t.label}</span>
                {typeof t.badge === "number" && t.badge > 0 ? (
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: MANAJEMEN & PEMANTAUAN PENGGUNA               */}
        {/* ---------------------------------------------------- */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search & Status Filter Bar */}
            <div className="flex flex-col gap-3 rounded-3xl border border-border/80 bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari akun pengguna berdasarkan Username, ID, dan Email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-2xl border border-border/80 bg-secondary/50 pl-10 pr-4 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                />
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => setUserSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-secondary/40 p-1 border border-border/60">
                {[
                  { key: "all", label: "Semua", count: users.length },
                  {
                    key: "active",
                    label: "Aktif",
                    count: users.filter((u) => !u.isSuspended && u.role !== "admin").length,
                  },
                  {
                    key: "suspended",
                    label: "Tersuspend",
                    count: users.filter((u) => Boolean(u.isSuspended)).length,
                  },
                  {
                    key: "admin",
                    label: "Admin",
                    count: users.filter((u) => u.role === "admin").length,
                  },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setUserStatusFilter(f.key as any)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      userStatusFilter === f.key
                        ? "bg-card text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </div>

            {/* List Pengguna */}
            {loadingUsers ? (
              <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-sm font-medium text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span>Memuat data pengguna...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-sm text-muted-foreground">
                <Users className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="font-semibold text-foreground">Tidak ada pengguna yang cocok</p>
                <p className="text-xs text-muted-foreground mt-1">Coba gunakan kata kunci pencarian atau filter status yang lain.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredUsers.map((u) => {
                  const isSuspended = Boolean(u.isSuspended);
                  const isAdmin = u.role === "admin";
                  const level = Math.min(20, u.level || 1);

                  return (
                    <div
                      key={u.uid}
                      className={`flex flex-col justify-between gap-4 rounded-3xl border p-4 shadow-soft transition-all duration-200 ${
                        isSuspended
                          ? "border-destructive/40 bg-destructive/5 dark:bg-destructive/10"
                          : isAdmin
                          ? "border-sky-deep/40 bg-sky-deep/5 dark:bg-sky-deep/10"
                          : "border-border/80 bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Avatar */}
                        <div
                          className="size-12 shrink-0 rounded-full flex items-center justify-center font-bold text-white shadow-soft overflow-hidden"
                          style={{
                            backgroundImage: u.avatarUrl
                              ? undefined
                              : `linear-gradient(140deg, oklch(0.78 0.11 ${u.hue || 140}), oklch(0.66 0.13 ${(u.hue || 140) + 25}))`,
                          }}
                        >
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.username} className="size-full object-cover" />
                          ) : (
                            u.initials || (u.username || "TN").slice(0, 2).toUpperCase()
                          )}
                        </div>

                        {/* User Basic Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="truncate text-sm font-bold text-foreground">{u.username}</p>
                            <span className="text-[10px] font-semibold text-muted-foreground">{u.accountId}</span>
                            {isAdmin && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-deep/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-deep">
                                <ShieldCheck className="size-3" /> Admin
                              </span>
                            )}
                            {isSuspended && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                                <ShieldAlert className="size-3" /> Tersuspend
                              </span>
                            )}
                            {!isAdmin && !isSuspended && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-leaf/15 px-1.5 py-0.5 text-[10px] font-bold text-leaf">
                                <Check className="size-3" /> Aktif
                              </span>
                            )}
                          </div>

                          {u.email && (
                            <p className="truncate text-[11px] text-muted-foreground mt-0.5">{u.email}</p>
                          )}

                          {/* Stats Row */}
                          <div className="mt-2.5 flex items-center gap-2.5 flex-wrap text-[11px] text-muted-foreground font-medium">
                            <span className="flex items-center gap-1 rounded-lg bg-secondary/60 px-2 py-0.5">
                              <TreePine className="size-3 text-leaf" /> Lv {level}
                            </span>
                            <span className="flex items-center gap-1 rounded-lg bg-secondary/60 px-2 py-0.5">
                              <LogIn className="size-3 text-sun" /> {u.totalLogins || 0} Login
                            </span>
                            <span className="flex items-center gap-1 rounded-lg bg-secondary/60 px-2 py-0.5">
                              <Users className="size-3 text-sky-deep" /> {u.friendCount || 0} Teman
                            </span>
                          </div>

                          {/* Suspension Reason Warning */}
                          {isSuspended && (
                            <div className="mt-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-2 text-[11px] text-destructive">
                              <p className="font-semibold flex items-center gap-1">
                                <AlertTriangle className="size-3" /> Alasan Suspend:
                              </p>
                              <p className="mt-0.5">{u.suspendReason || "Pelanggaran aturan komunitas"}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        <button
                          type="button"
                          onClick={() => handleOpenUserDetail(u)}
                          className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                        >
                          <Eye className="size-3.5" /> Detail
                        </button>

                        {!isAdmin && !isSuspended && (
                          <button
                            type="button"
                            onClick={() => {
                              setSuspendingUser(u);
                              setSuspendReason("");
                            }}
                            className="flex items-center gap-1 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-white transition-all cursor-pointer active:scale-95"
                          >
                            <UserX className="size-3.5" /> Suspend
                          </button>
                        )}

                        {!isAdmin && isSuspended && (
                          <button
                            type="button"
                            onClick={() => setUnsuspendingUser(u)}
                            className="flex items-center gap-1 rounded-xl bg-leaf px-3 py-1.5 text-xs font-bold text-white hover:bg-leaf/90 transition-all cursor-pointer active:scale-95 shadow-soft"
                          >
                            <UserCheck className="size-3.5" /> Pulihkan
                          </button>
                        )}

                        {!isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeletingUser(u)}
                            title="Hapus Akun Pengguna"
                            className="flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: MODERASI TREEGALLERY                          */}
        {/* ---------------------------------------------------- */}
        {activeTab === "gallery" && (
          <div>
            {/* Filter Tab & Action Buttons */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 overflow-x-auto rounded-3xl border border-border/80 bg-card dark:border-border/60 dark:bg-secondary/40 p-1.5 shadow-soft">
                {[
                  { key: "pending", label: "Menunggu Moderasi" },
                  { key: "history", label: "Riwayat Video" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => handleGalleryFilterChange(t.key as "pending" | "history")}
                    className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                      galleryFilter === t.key
                        ? "bg-primary text-primary-foreground shadow-soft scale-[1.02]"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {galleryFilter === "history" && videos.length > 0 && (
                  <motion.button
                    key="clear-history-btn"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowClearHistoryModal(true)}
                    className="flex items-center gap-1.5 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive shadow-soft transition-all hover:bg-destructive hover:text-white cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Hapus Semua Riwayat Video</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Daftar Video */}
            <AnimatePresence mode="wait">
              <motion.div
                key={galleryFilter}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                {loadingVideos ? (
                  <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-sm font-medium text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <span>Memuat daftar video moderasi...</span>
                  </div>
                ) : videos.length === 0 ? (
                  <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-sm font-medium text-muted-foreground">
                    Tidak ada video dalam kategori ini.
                  </div>
                ) : (
                  videos.map((video) => {
                    const yId = youtubeId(video.url);
                    const isUpload =
                      video.sourceType === "upload" ||
                      video.url.startsWith("indexeddb:") ||
                      video.url.startsWith("blob:");
                    const uploader = uploaderProfiles[video.uid];
                    return (
                      <div
                        key={video.id}
                        className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-soft dark:border-border/60 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            onClick={() => setPreviewVideo(video)}
                            className="group relative h-24 w-36 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-secondary shadow-inner"
                            title="Klik untuk memutar video"
                          >
                            <VideoThumbnail video={video} yt={yId} />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex size-9 items-center justify-center rounded-full bg-white/90 text-neutral-950 shadow-md">
                                <Play className="size-4 fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-bold text-foreground text-base">{video.title}</h3>
                            {uploader && (
                              <p className="mt-0.5 text-xs font-semibold text-foreground">
                                Pengunggah: <span className="text-primary">{uploader.username}</span> ({uploader.accountId})
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Pengunggah (UID): <code className="font-mono text-[10px]">{video.uid}</code>
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Diunggah: {timeAgo(video.submittedAt)} · Tipe:{" "}
                              <span className="font-semibold uppercase">{video.sourceType}</span>
                            </p>

                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewVideo(video)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 px-3 py-1.5 text-xs font-bold text-primary transition-colors cursor-pointer"
                              >
                                <Play className="size-3.5 fill-current" /> Putar Video
                              </button>
                              {!isUpload && (
                                <a
                                  href={video.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground underline"
                                >
                                  <ExternalLink className="size-3" /> Buka Tautan
                                </a>
                              )}
                            </div>

                            {video.status === "approved" && video.approvalComment && (
                              <p className="mt-2 rounded-xl bg-leaf/10 p-2 text-xs font-medium text-leaf">
                                Catatan Persetujuan: {video.approvalComment}
                              </p>
                            )}

                            {video.status === "rejected" && video.reason && (
                              <p className="mt-2 rounded-xl bg-destructive/10 p-2 text-xs font-medium text-destructive">
                                Alasan Penolakan: {video.reason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {video.status === "pending" ? (
                            <>
                              <button
                                onClick={() => {
                                  setApprovingId(video.id);
                                  setApprovalComment("");
                                }}
                                className="inline-flex items-center justify-center rounded-2xl bg-gradient-leaf px-4 py-2 text-xs font-bold text-white shadow-soft transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                              >
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                Setujui
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(video.id);
                                  setRejectReason("");
                                }}
                                className="inline-flex items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive transition-all hover:bg-destructive/20 active:scale-95 cursor-pointer"
                              >
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                Tolak
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeletingVideoId(video.id)}
                              title="Hapus Video dari Riwayat"
                              className="inline-flex items-center justify-center rounded-2xl border border-border p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: STATISTIK & METRIK SISTEM                    */}
        {/* ---------------------------------------------------- */}
        {activeTab === "metrics" && (
          <div className="space-y-6">
            {loadingMetrics ? (
              <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-sm font-medium text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span>Memuat ringkasan metrik...</span>
              </div>
            ) : metrics ? (
              <>
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Total Pengguna</span>
                      <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Users className="size-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-foreground">{metrics.totalUsers}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Akun terdaftar di sistem</p>
                  </div>

                  <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Pengguna Aktif</span>
                      <div className="flex size-8 items-center justify-center rounded-xl bg-leaf/15 text-leaf">
                        <UserCheck className="size-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-leaf">{metrics.activeUsers}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Status akun normal</p>
                  </div>

                  <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Tersuspend</span>
                      <div className="flex size-8 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                        <ShieldAlert className="size-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-destructive">{metrics.suspendedUsers}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Akun diblokir sementara</p>
                  </div>

                  <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Total Video</span>
                      <div className="flex size-8 items-center justify-center rounded-xl bg-sky-deep/15 text-sky-deep">
                        <Video className="size-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-sky-deep">{metrics.totalVideos}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">TreeGallery diajukan</p>
                  </div>

                  <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Menunggu Review</span>
                      <div className="flex size-8 items-center justify-center rounded-xl bg-sun/15 text-sun">
                        <Clock className="size-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-sun">{metrics.pendingVideos}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Perlu tindakan moderasi</p>
                  </div>

                  <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Video Disetujui</span>
                      <div className="flex size-8 items-center justify-center rounded-xl bg-leaf/15 text-leaf">
                        <Check className="size-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-leaf">{metrics.approvedVideos}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Tampil di galeri publik</p>
                  </div>
                </div>

                {/* Health & Status Card */}
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Activity className="size-4 text-primary" /> Status Layanan TreeNest
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    <div className="rounded-2xl bg-secondary/50 p-3.5">
                      <p className="text-muted-foreground">Sistem Autentikasi</p>
                      <p className="font-bold text-leaf mt-1">Normal & Aktif</p>
                    </div>
                    <div className="rounded-2xl bg-secondary/50 p-3.5">
                      <p className="text-muted-foreground">Basis Data Firestore</p>
                      <p className="font-bold text-leaf mt-1">Terhubung</p>
                    </div>
                    <div className="rounded-2xl bg-secondary/50 p-3.5">
                      <p className="text-muted-foreground">Sinkronisasi Realtime</p>
                      <p className="font-bold text-leaf mt-1">Berjalan</p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODAL: DETAIL PENGGUNA                              */}
        {/* ---------------------------------------------------- */}
        {selectedUserDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setSelectedUserDetail(null)}
          >
            <div
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-border/80 bg-card p-6 shadow-xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Info className="size-4" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">Detail Pengguna</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserDetail(null)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Profile Card */}
              <div className="flex items-center gap-4 rounded-2xl bg-secondary/40 p-4 border border-border/60">
                <div
                  className="size-14 shrink-0 rounded-full flex items-center justify-center font-bold text-white shadow-soft overflow-hidden"
                  style={{
                    backgroundImage: selectedUserDetail.avatarUrl
                      ? undefined
                      : `linear-gradient(140deg, oklch(0.78 0.11 ${selectedUserDetail.hue || 140}), oklch(0.66 0.13 ${(selectedUserDetail.hue || 140) + 25}))`,
                  }}
                >
                  {selectedUserDetail.avatarUrl ? (
                    <img src={selectedUserDetail.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    selectedUserDetail.initials || selectedUserDetail.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground text-sm">{selectedUserDetail.username}</h4>
                    <span className="text-[10px] font-semibold text-muted-foreground">{selectedUserDetail.accountId}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{selectedUserDetail.email || "Tanpa email"}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">UID: {selectedUserDetail.uid}</p>
                </div>
              </div>

              {/* Bio */}
              {selectedUserDetail.bio && (
                <div className="rounded-2xl bg-secondary/30 p-3.5 border border-border/50 text-xs">
                  <p className="font-semibold text-foreground mb-1">Bio Akun:</p>
                  <p className="text-muted-foreground italic">"{selectedUserDetail.bio}"</p>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-2xl bg-secondary/50 p-3">
                  <p className="text-muted-foreground text-[10px]">Level Pohon</p>
                  <p className="text-sm font-bold text-leaf mt-0.5">Lv {selectedUserDetail.level || 1}</p>
                </div>
                <div className="rounded-2xl bg-secondary/50 p-3">
                  <p className="text-muted-foreground text-[10px]">Total EXP</p>
                  <p className="text-sm font-bold text-sun mt-0.5">{selectedUserDetail.exp || 0}</p>
                </div>
                <div className="rounded-2xl bg-secondary/50 p-3">
                  <p className="text-muted-foreground text-[10px]">Total Login</p>
                  <p className="text-sm font-bold text-sky-deep mt-0.5">{selectedUserDetail.totalLogins || 0}x</p>
                </div>
              </div>

              {/* Uploaded Videos */}
              <div className="space-y-2 pt-1">
                <h5 className="text-xs font-bold text-foreground">Video TreeGallery Diunggah ({userVideos.length})</h5>
                {loadingUserVideos ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">Memuat riwayat video...</p>
                ) : userVideos.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 italic">Belum ada video yang diunggah pengguna ini.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {userVideos.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-xl bg-secondary/40 p-2.5 text-xs border border-border/40"
                      >
                        <p className="font-semibold text-foreground truncate max-w-[240px]">{v.title}</p>
                        <span
                          className={`text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5 ${
                            v.status === "approved"
                              ? "bg-leaf/15 text-leaf"
                              : v.status === "rejected"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-sun/15 text-sun"
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setSelectedUserDetail(null)}
                  className="rounded-2xl border border-input px-4 py-2 text-xs font-bold text-foreground hover:bg-accent cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODAL: SUSPEND PENGGUNA                              */}
        {/* ---------------------------------------------------- */}
        {suspendingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-card p-6 shadow-xl space-y-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive mx-auto">
                <ShieldAlert className="size-6" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-foreground">Suspend / Blokir Akun Pengguna</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Akun <strong>{suspendingUser.username}</strong> ({suspendingUser.accountId}) tidak akan dapat menggunakan fitur aplikasi selama masa penangguhan.
                </p>
              </div>
              <form onSubmit={handleConfirmSuspend} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Alasan Penangguhan / Pemblokiran:
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Contoh: Terdeteksi melakukan spam chat / melanggar pedoman komunitas."
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    className="w-full rounded-2xl border border-input bg-secondary/50 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-destructive focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => {
                      setSuspendingUser(null);
                      setSuspendReason("");
                    }}
                    className="flex-1 rounded-2xl border border-input py-2.5 text-xs font-bold text-foreground hover:bg-accent cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingAction}
                    className="flex-1 rounded-2xl bg-destructive py-2.5 text-xs font-bold text-white hover:bg-destructive/90 transition-colors shadow-soft cursor-pointer"
                  >
                    {isProcessingAction ? "Memproses..." : "Konfirmasi Suspend"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODAL: UNSUSPEND / PULIHKAN PENGGUNA                 */}
        {/* ---------------------------------------------------- */}
        {unsuspendingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-leaf/40 bg-card p-6 shadow-xl space-y-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-leaf/15 text-leaf mx-auto">
                <UserCheck className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Pulihkan Akun Pengguna?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Status suspensi akun <strong>{unsuspendingUser.username}</strong> ({unsuspendingUser.accountId}) akan dicabut dan pengguna dapat kembali beraktivitas normal.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => setUnsuspendingUser(null)}
                  className="flex-1 rounded-2xl border border-input py-2.5 text-xs font-bold text-foreground hover:bg-accent cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleConfirmUnsuspend}
                  className="flex-1 rounded-2xl bg-leaf py-2.5 text-xs font-bold text-white hover:bg-leaf/90 transition-colors shadow-soft cursor-pointer"
                >
                  {isProcessingAction ? "Memproses..." : "Ya, Pulihkan Akun"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODAL: HAPUS AKUN PENGGUNA                           */}
        {/* ---------------------------------------------------- */}
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-card p-6 shadow-xl space-y-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive mx-auto">
                <Trash2 className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Hapus Akun Pengguna Secara Permanen?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tindakan ini akan menghapus seluruh data akun <strong>{deletingUser.username}</strong> ({deletingUser.accountId}) dari sistem. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 rounded-2xl border border-input py-2.5 text-xs font-bold text-foreground hover:bg-accent cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleConfirmDeleteUser}
                  className="flex-1 rounded-2xl bg-destructive py-2.5 text-xs font-bold text-white hover:bg-destructive/90 transition-colors shadow-soft cursor-pointer"
                >
                  {isProcessingAction ? "Menghapus..." : "Ya, Hapus Permanen"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODAL: MODERASI TREEGALLERY APPROVE / REJECT / ETC   */}
        {/* ---------------------------------------------------- */}
        {approvingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-xl">
              <h3 className="text-lg font-bold text-foreground">Komentar Persetujuan (Opsional)</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Tuliskan catatan atau masukan positif untuk video yang disetujui (opsional).
              </p>
              <form onSubmit={handleApproveSubmit} className="mt-4 space-y-4">
                <textarea
                  rows={3}
                  placeholder="Contoh: Keren banget videonya! Tetap semangat berkarya."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full rounded-2xl border border-input bg-secondary/50 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setApprovingId(null);
                      setApprovalComment("");
                    }}
                    className="rounded-2xl border border-input px-4 py-2 text-xs font-bold text-foreground hover:bg-accent cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  >
                    Konfirmasi Setujui
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {rejectingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-xl">
              <h3 className="text-lg font-bold text-foreground">Alasan Penolakan Video</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Tuliskan alasan mengapa video ini ditolak agar pemilik video mengetahuinya.
              </p>
              <form onSubmit={handleReject} className="mt-4 space-y-4">
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Durasi video melebihi 30 detik atau konten tidak sesuai aturan."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-2xl border border-input bg-secondary/50 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-destructive focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(null);
                      setRejectReason("");
                    }}
                    className="rounded-2xl border border-input px-4 py-2 text-xs font-bold text-foreground hover:bg-accent cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                  >
                    Konfirmasi Reject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {previewVideo && (
          <VideoPlayerModal
            video={previewVideo}
            onClose={() => setPreviewVideo(null)}
            adminActions={{
              onApprove: () => {
                setApprovingId(previewVideo.id);
                setApprovalComment("");
                setPreviewVideo(null);
              },
              onReject: () => {
                setRejectingId(previewVideo.id);
                setRejectReason("");
                setPreviewVideo(null);
              },
            }}
          />
        )}

        {deletingVideoId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-float text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <Trash2 className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Hapus Riwayat Video?</h3>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={confirmDeleteVideo}
                  className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 cursor-pointer"
                >
                  Ya, Hapus
                </button>
                <button
                  onClick={() => setDeletingVideoId(null)}
                  className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary/70 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {showClearHistoryModal && (
          <div
            onClick={() => setShowClearHistoryModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-float text-center space-y-4"
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Hapus Semua Riwayat Video?</h3>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleClearAllHistory}
                  className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-white transition-colors hover:bg-destructive/90 cursor-pointer shadow-soft"
                >
                  Ya, Hapus Semua
                </button>
                <button
                  onClick={() => setShowClearHistoryModal(false)}
                  className="flex-1 rounded-xl border border-border/80 bg-secondary/80 text-secondary-foreground py-2.5 text-xs font-bold transition-colors hover:bg-secondary/60 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function VideoThumbnail({ video, yt }: { video: GalleryVideo; yt: string | null }) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [tiktokThumb, setTiktokThumb] = useState<string | null>(video.thumbnail || null);

  useEffect(() => {
    let active = true;
    if (
      !yt &&
      (video.sourceType === "upload" ||
        video.url.startsWith("indexeddb:") ||
        video.url.startsWith("blob:"))
    ) {
      resolveVideoUrl(video.url, video.id).then((u) => {
        if (active && u) setLocalUrl(u);
      });
    } else if (!yt && video.sourceType === "tiktok" && !video.thumbnail) {
      fetchTikTokThumbnail(video.url).then((thumbUrl) => {
        if (active && thumbUrl) setTiktokThumb(thumbUrl);
      });
    }
    return () => {
      active = false;
    };
  }, [video.url, video.id, video.sourceType, video.thumbnail, yt]);

  if (yt) {
    return (
      <img
        src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`}
        alt={video.title}
        loading="lazy"
        className="size-full object-cover transition-transform group-hover:scale-105"
      />
    );
  }

  if (tiktokThumb) {
    return (
      <img
        src={tiktokThumb}
        alt={video.title}
        loading="lazy"
        className="size-full object-cover transition-transform group-hover:scale-105"
      />
    );
  }

  if (localUrl) {
    return (
      <video
        src={localUrl}
        className="size-full object-cover transition-transform group-hover:scale-105"
        muted
        preload="metadata"
      />
    );
  }

  return (
    <div className="flex size-full items-center justify-center bg-gradient-to-br from-leaf/15 to-primary/10 text-muted-foreground">
      <Film className="size-8 text-muted-foreground/60" />
    </div>
  );
}
