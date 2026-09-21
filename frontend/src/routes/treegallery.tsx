import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Images,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Play,
  X,
  ShieldCheck,
  Star,
  Upload,
  Link2,
  Film,
  AlertCircle,
  RefreshCw,
  RotateCw,
  ExternalLink,
  Check,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  Info,
  Sparkles,
  Settings,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { EmptyState } from "@/components/EmptyState";
import { PublicProfileModal } from "@/components/PublicProfileModal";
import { useAuth, useIsAdmin } from "@/lib/auth-context";
import { storage, isFirebaseConfigured } from "@/lib/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  getUserVideos,
  getAllGalleryVideosAdmin,
  addGalleryVideo,
  cancelGalleryVideo,
  moderateVideo,
  deleteGalleryVideo,
  deleteGalleryVideoAdmin,
  clearAllVideoHistoryAdmin,
  setFeaturedVideo,
  getFeaturedVideoId,
  getUserProfile,
  type UserProfile,
} from "@/lib/firestore-service";
import {
  MAX_VIDEOS,
  MAX_DURATION_SEC,
  youtubeId,
  tiktokId,
  fetchTikTokThumbnail,
  detectSource,
  timeAgo,
  type GalleryVideo,
} from "@/lib/social";
import { awardActivityExp } from "@/lib/exp-service";
import { saveVideoBlob, resolveVideoUrl, deleteVideoBlob } from "@/lib/video-storage";

export const Route = createFileRoute("/treegallery")({
  head: () => ({
    meta: [
      { title: "TreeGallery — Pamerkan Videomu" },
      {
        name: "description",
        content:
          "Unggah video berdurasi maksimal 3 menit & ukuran file maksimal 50 MB, atau tempelkan tautan (YouTube/TikTok) tanpa batasan durasi!",
      },
      { property: "og:title", content: "TreeGallery — Pamerkan Videomu" },
      {
        property: "og:description",
        content: "Galeri video dengan moderasi Admin di TreeNest.",
      },
    ],
  }),
  component: TreeGalleryPage,
});

const STATUS_META = {
  approved: {
    label: "Disetujui",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/15",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/35",
    cornerBadgeClass: "bg-emerald-950/85 dark:bg-black/75 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
  },
  pending: {
    label: "Menunggu Moderasi",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/15",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:border-amber-500/35",
    cornerBadgeClass: "bg-amber-950/85 dark:bg-black/75 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
  },
  rejected: {
    label: "Ditolak",
    icon: AlertCircle,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/15",
    badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:border-rose-500/35",
    cornerBadgeClass: "bg-rose-950/85 dark:bg-black/75 border-rose-500/50 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]",
  },
  cancelled: {
    label: "Dibatalkan",
    icon: XCircle,
    color: "text-neutral-500 dark:text-neutral-400",
    bg: "bg-neutral-500/15",
    badgeClass: "border-neutral-500/30 bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 dark:border-neutral-500/35",
    cornerBadgeClass: "bg-neutral-900/85 dark:bg-black/75 border-neutral-600/50 text-neutral-400",
  },
} as const;

const SOURCE_LABEL: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  upload: "File Upload",
  link: "Tautan Link",
};

const ACCEPT_TYPES = "video/mp4,video/webm,video/quicktime,video/ogg";
const MAX_FILE_MB = 50;
const MAX_TITLE_LENGTH = 50;

function TreeGalleryPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = useIsAdmin();
  const uid = profile?.uid ?? "guest";

  const [myVideos, setMyVideos] = useState<GalleryVideo[]>([]);
  const [adminVideos, setAdminVideos] = useState<GalleryVideo[]>([]);
  const [uploaderProfiles, setUploaderProfiles] = useState<Record<string, UserProfile>>({});
  const [adminTab, setAdminTab] = useState<"pending" | "history">("pending");
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(true);

  // Upload form state
  const [uploadTab, setUploadTab] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navigation tabs state
  const [mainTab, setMainTab] = useState<"gallery" | "my_status" | "admin">("gallery");
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [hasActivityNotif, setHasActivityNotif] = useState<boolean>(() => {
    try {
      return localStorage.getItem("treegallery_activity_notif") === "true";
    } catch {
      return false;
    }
  });

  const clearActivityNotif = useCallback(() => {
    setHasActivityNotif(false);
    try {
      localStorage.removeItem("treegallery_activity_notif");
    } catch {}
  }, []);

  // Modals & Popups
  const [showConfirmUpload, setShowConfirmUpload] = useState(false);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [preview, setPreview] = useState<GalleryVideo | null>(null);
  const [viewCommentVideo, setViewCommentVideo] = useState<GalleryVideo | null>(null);
  const [selectedUploaderAccountId, setSelectedUploaderAccountId] = useState<string | null>(null);
  const [deleteTargetVideo, setDeleteTargetVideo] = useState<GalleryVideo | null>(null);
  const [adminDeletingId, setAdminDeletingId] = useState<string | null>(null);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [infoVideo, setInfoVideo] = useState<GalleryVideo | null>(null);

  const isAnyModalOpen = Boolean(
    showConfirmUpload ||
    approveTarget ||
    rejectTarget ||
    preview ||
    viewCommentVideo ||
    selectedUploaderAccountId ||
    deleteTargetVideo ||
    adminDeletingId ||
    showClearHistoryModal ||
    infoVideo
  );
  useScrollLock(isAnyModalOpen);

  const [readComments, setReadComments] = useState<Record<string, boolean>>(() => {
    try {
      const local = localStorage.getItem("treenest_read_comments");
      return local ? JSON.parse(local) : {};
    } catch {
      return {};
    }
  });

  const markCommentAsRead = useCallback((videoId: string) => {
    setReadComments((prev) => {
      if (prev[videoId]) return prev;
      const updated = { ...prev, [videoId]: true };
      localStorage.setItem("treenest_read_comments", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const [dragOver, setDragOver] = useState(false);
  const [showActionTime, setShowActionTime] = useState<Record<string, boolean>>({});

  // ─── Load data ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingVideos(true);
    const [myVids, fid] = await Promise.all([getUserVideos(uid), getFeaturedVideoId(uid)]);
    setMyVideos(myVids);
    setFeaturedId(fid);
    if (isAdmin) {
      const adminList = await getAllGalleryVideosAdmin(adminTab);
      setAdminVideos(adminList);

      const uniqueUids = Array.from(new Set(adminList.map((v) => v.uid).filter(Boolean)));
      const profiles = await Promise.all(uniqueUids.map((u) => getUserProfile(u)));
      const map: Record<string, UserProfile> = {};
      profiles.forEach((p) => {
        if (p?.uid) map[p.uid] = p;
      });
      setUploaderProfiles(map);
    }
    setLoadingVideos(false);
  }, [uid, isAdmin, adminTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Scroll Restoration when returning from Admin Panel
  useEffect(() => {
    let r1: number | undefined;
    let t1: NodeJS.Timeout | undefined;
    let t2: NodeJS.Timeout | undefined;
    let t3: NodeJS.Timeout | undefined;
    let t4: NodeJS.Timeout | undefined;

    const restoreScrollStr =
      typeof window !== "undefined" ? sessionStorage.getItem("treenest_restore_scroll") : null;
    if (restoreScrollStr) {
      const targetScroll = Number(restoreScrollStr);
      if (targetScroll > 0) {
        const doScroll = () => {
          window.scrollTo({ top: targetScroll, left: 0, behavior: "instant" });
        };
        doScroll();
        r1 = requestAnimationFrame(doScroll);
        t1 = setTimeout(doScroll, 40);
        t2 = setTimeout(doScroll, 120);
        t3 = setTimeout(doScroll, 250);
        t4 = setTimeout(() => {
          doScroll();
          sessionStorage.removeItem("treenest_restore_scroll");
        }, 450);
      }
    }

    return () => {
      if (r1) cancelAnimationFrame(r1);
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
      if (t4) clearTimeout(t4);
    };
  }, []);

  // ─── Derived ──────────────────────────────────────────────────────
  const approved = useMemo(() => myVideos.filter((v) => v.status === "approved"), [myVideos]);
  const displayedApproved = useMemo(() => approved.slice(0, 5), [approved]);
  const myNonApproved = useMemo(() => myVideos.filter((v) => v.status !== "approved"), [myVideos]);
  const canUpload = true;

  // ─── Pagination / Infinite Scroll Aktivitas (20 video per sesi) ───
  const [activityPage, setActivityPage] = useState(1);
  const [loadingMoreActivity, setLoadingMoreActivity] = useState(false);
  const activityObserverRef = useRef<HTMLDivElement | null>(null);

  const displayedMyVideos = useMemo(
    () => myVideos.slice(0, activityPage * 20),
    [myVideos, activityPage]
  );
  const hasMoreActivity = displayedMyVideos.length < myVideos.length;

  useEffect(() => {
    if (!activityObserverRef.current || !hasMoreActivity || loadingMoreActivity || loadingVideos) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreActivity && !loadingMoreActivity) {
          setLoadingMoreActivity(true);
          setTimeout(() => {
            setActivityPage((prev) => prev + 1);
            setLoadingMoreActivity(false);
          }, 650);
        }
      },
      { threshold: 0.1, rootMargin: "120px" }
    );

    const el = activityObserverRef.current;
    observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [hasMoreActivity, loadingMoreActivity, loadingVideos]);

  // Track video yang sudah dilihat user di tab Galeri
  const [seenApprovedIds, setSeenApprovedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("treenest_seen_approved_videos");
      if (raw) return new Set<string>(JSON.parse(raw));
      return new Set<string>(["seed-1", "seed-2", "seed-3"]);
    } catch {
      return new Set<string>(["seed-1", "seed-2", "seed-3"]);
    }
  });

  // Track apakah user sedang membuka atau telah membuka tab Galeri pada kunjungan saat ini
  const hasVisitedGalleryRef = useRef(mainTab === "gallery");

  useEffect(() => {
    if (mainTab === "gallery") {
      hasVisitedGalleryRef.current = true;
    }
  }, [mainTab]);

  // Video approved baru yang belum pernah dilihat oleh user di Galeri
  const unseenApprovedVideos = useMemo(() => {
    return approved.filter((v) => !seenApprovedIds.has(v.id));
  }, [approved, seenApprovedIds]);

  // Ada notifikasi titik merah di tombol tab "Galeri" jika terdapat video approved yang belum dilihat
  const hasGalleryNotif = unseenApprovedVideos.length > 0;

  // Hanya tandai video sebagai "sudah dilihat" ketika user MENINGGALKAN tab Galeri (setelah benar-benar melihatnya)
  useEffect(() => {
    if (mainTab !== "gallery" && hasVisitedGalleryRef.current && approved.length > 0) {
      hasVisitedGalleryRef.current = false;
      try {
        const raw = localStorage.getItem("treenest_seen_approved_videos");
        const set = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
        approved.forEach((v) => set.add(v.id));
        localStorage.setItem("treenest_seen_approved_videos", JSON.stringify(Array.from(set)));
        setSeenApprovedIds(new Set(set));
      } catch {}
    }
  }, [mainTab, approved]);

  // Saat meninggalkan halaman TreeGallery (unmount): simpan video yang telah dilihat
  useEffect(() => {
    return () => {
      if (hasVisitedGalleryRef.current && approved.length > 0) {
        try {
          const raw = localStorage.getItem("treenest_seen_approved_videos");
          const set = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
          approved.forEach((v) => set.add(v.id));
          localStorage.setItem("treenest_seen_approved_videos", JSON.stringify(Array.from(set)));
        } catch {}
      }
    };
  }, [approved]);

  // ─── File handling ────────────────────────────────────────────────
  function validateAndSetVideoFile(f: File) {
    if (!f.type.startsWith("video/")) {
      setUploadError("Hanya file video yang diterima (MP4, WebM, MOV).");
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`Ukuran file maksimal ${MAX_FILE_MB}MB.`);
      return;
    }

    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.onloadedmetadata = () => {
      window.URL.revokeObjectURL(tempVideo.src);
      if (tempVideo.duration > MAX_DURATION_SEC) {
        setUploadError(`Durasi video file maksimal ${MAX_DURATION_SEC / 60} menit (${MAX_DURATION_SEC} detik).`);
      } else {
        setFile(f);
        setUploadError(null);
      }
    };
    tempVideo.onerror = () => {
      setFile(f);
      setUploadError(null);
    };
    tempVideo.src = URL.createObjectURL(f);
  }

  function handleFileDrop(e: React.DragEvent) {
    if (uploading) return;
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      validateAndSetVideoFile(dropped);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (uploading) return;
    const selected = e.target.files?.[0] ?? null;
    if (selected) {
      validateAndSetVideoFile(selected);
    }
  }

  function handleTriggerSubmit() {
    const t = title.trim();
    if (!t) {
      setUploadError("Judul wajib diisi.");
      return;
    }
    if (t.length > MAX_TITLE_LENGTH) {
      setUploadError(`Judul video maksimal ${MAX_TITLE_LENGTH} karakter.`);
      return;
    }
    if (!canUpload) return;
    if (uploadTab === "file" && !file) {
      setUploadError("Pilih file video terlebih dahulu.");
      return;
    }
    if (uploadTab === "link" && !url.trim()) {
      setUploadError("Masukkan URL video.");
      return;
    }
    setUploadError(null);
    setShowConfirmUpload(true);
  }

  // ─── Upload Execution ─────────────────────────────────────────────
  async function executeUpload() {
    setShowConfirmUpload(false);
    const t = title.trim();
    if (!t || !canUpload) return;

    setUploading(true);
    setUploadError(null);

    let progressTimer: ReturnType<typeof setInterval> | null = null;

    try {
      if (uploadTab === "file") {
        if (!file) {
          setUploadError("Pilih file video terlebih dahulu.");
          setUploading(false);
          return;
        }

        // Langsung berikan progress awal (5%) agar tidak pernah stuck di 0%
        setUploadProgress(5);

        // Smooth ticker incrementing progress from 5% to 92%
        progressTimer = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev === null) return 5;
            if (prev < 92) {
              return prev + Math.floor(Math.random() * 3 + 2);
            }
            return prev;
          });
        }, 180);

        let videoUrl = "";
        const tempMediaId = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        
        // Simpan file blob ke IndexedDB agar tidak hilang saat refresh halaman
        await saveVideoBlob(tempMediaId, file);

        if (isFirebaseConfigured && storage) {
          try {
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const path = `gallery/${uid}/${Date.now()}_${cleanName}`;
            const sRef = storageRef(storage, path);
            
            // Upload dengan timeout & fallback otomatis jika Firebase Storage terblokir/hang
            videoUrl = await new Promise<string>((resolve, reject) => {
              const task = uploadBytesResumable(sRef, file);
              const timeoutId = setTimeout(() => {
                task.cancel();
                reject(new Error("Storage upload timeout"));
              }, 12000);

              task.on(
                "state_changed",
                (snap) => {
                  if (snap.totalBytes > 0) {
                    const snapPct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                    setUploadProgress((prev) => Math.max(prev ?? 5, snapPct));
                  }
                },
                (err) => {
                  clearTimeout(timeoutId);
                  reject(err);
                },
                async () => {
                  clearTimeout(timeoutId);
                  try {
                    const dl = await getDownloadURL(task.snapshot.ref);
                    resolve(dl);
                  } catch (e) {
                    reject(e);
                  }
                },
              );
            });
          } catch (storageErr) {
            console.warn("Firebase Storage upload fallback triggered:", storageErr);
            videoUrl = `indexeddb:${tempMediaId}`;
          }
        } else {
          videoUrl = `indexeddb:${tempMediaId}`;
        }

        const createdVid = await addGalleryVideo(uid, { title: t, url: videoUrl, sourceType: "upload" });
        if (createdVid && createdVid.id) {
          // Hubungkan blob dengan id permanen
          await saveVideoBlob(createdVid.id, file);
        }

        if (progressTimer) clearInterval(progressTimer);
        setUploadProgress(100);
        await new Promise((r) => setTimeout(r, 350));
      } else {
        const u = url.trim();
        if (!u) {
          setUploadError("Masukkan URL video.");
          setUploading(false);
          return;
        }
        const src = detectSource(u);
        await addGalleryVideo(uid, { title: t, url: u, sourceType: src });
      }

      setTitle("");
      setUrl("");
      setFile(null);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (uid !== "guest") awardActivityExp(uid, "gallery");
      setShowUploadPanel(false);
      setHasActivityNotif(true);
      try {
        localStorage.setItem("treegallery_activity_notif", "true");
      } catch {}
      await loadData();
    } catch (err) {
      setUploadError("Gagal mengunggah video. Coba lagi.");
      console.error(err);
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setUploading(false);
      setUploadProgress(null);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────
  async function handleDelete(videoId: string) {
    await deleteGalleryVideo(videoId, uid);
    await deleteVideoBlob(videoId);
    if (featuredId === videoId) {
      await setFeaturedVideo(uid, null);
      setFeaturedId(null);
    }
    await loadData();
  }

  async function confirmAdminDelete() {
    if (!adminDeletingId) return;
    await deleteGalleryVideoAdmin(adminDeletingId);
    setAdminDeletingId(null);
    await loadData();
  }

  async function handleClearAllHistory() {
    await clearAllVideoHistoryAdmin();
    setShowClearHistoryModal(false);
    await loadData();
  }

  // ─── Featured ─────────────────────────────────────────────────────
  async function toggleFeatured(videoId: string) {
    const next = featuredId === videoId ? null : videoId;
    await setFeaturedVideo(uid, next);
    setFeaturedId(next);
  }

  // ─── Moderate (admin) ─────────────────────────────────────────────
  async function handleApproveConfirm() {
    if (!approveTarget) return;
    const targetVideo =
      myVideos.find((v) => v.id === approveTarget) ||
      adminVideos.find((v) => v.id === approveTarget);
    await moderateVideo(approveTarget, "approved", approvalComment.trim());
    if (targetVideo) {
      import("@/lib/notification-service").then(({ addNotification }) => {
        addNotification({
          type: "video_approved",
          title: "Video Disetujui!",
          message: `Video '${targetVideo.title}' milikmu telah disetujui Admin dan tayang di TreeGallery!`,
          link: "/treegallery",
          targetUid: targetVideo.uid,
        });
      });
      // Nyalakan notif merah pada Aktivitas
      setHasActivityNotif(true);
      try {
        localStorage.setItem("treegallery_activity_notif", "true");
      } catch {}
    }
    setApproveTarget(null);
    setApprovalComment("");
    await loadData();
  }

  async function handleRejectConfirm() {
    if (!rejectTarget) return;
    const targetVideo =
      myVideos.find((v) => v.id === rejectTarget) ||
      adminVideos.find((v) => v.id === rejectTarget);
    const reasonText = rejectReason.trim() || "Tidak memenuhi aturan.";
    await moderateVideo(rejectTarget, "rejected", reasonText);
    if (targetVideo) {
      import("@/lib/notification-service").then(({ addNotification }) => {
        addNotification({
          type: "video_rejected",
          title: "Video Ditolak Admin",
          message: `Video '${targetVideo.title}' ditolak Admin. Alasan: ${reasonText}`,
          link: "/treegallery",
          targetUid: targetVideo.uid,
        });
      });
      // Nyalakan notif merah pada Aktivitas
      setHasActivityNotif(true);
      try {
        localStorage.setItem("treegallery_activity_notif", "true");
      } catch {}
    }
    setRejectTarget(null);
    setRejectReason("");
    await loadData();
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <PageShell
      className="w-full px-3 sm:px-5 md:px-8 xl:px-10 pt-20 sm:pt-24 max-w-[1920px] mx-auto pb-28 md:pb-16"
    >
      {/* ── HEADER HERO TREESTYLE ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b-2 border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            TreeGallery
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Simpan dan pamerkan video pilihanmu di TreeNest!
          </p>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => setShowUploadPanel((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold shadow-soft transition-all active:scale-95 cursor-pointer ${
              showUploadPanel
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/80"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-float"
            }`}
          >
            <span>{showUploadPanel ? "Batal" : "Unggah"}</span>
          </button>

          <button
            onClick={() => navigate({ to: "/treegallery-all" })}
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-xs sm:text-sm font-bold text-foreground shadow-soft transition-all hover:bg-secondary active:scale-95 cursor-pointer"
            title="Jelajahi seluruh video yang diunggah semua pengguna TreeNest"
          >
            <span>TreeGallery All</span>
          </button>

          <button
            onClick={loadData}
            disabled={loadingVideos || uploading}
            className="group flex size-10 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground shadow-soft hover:bg-secondary hover:text-foreground transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Segarkan Data"
          >
            <RotateCw className={`size-4 transition-transform duration-300 ${loadingVideos ? "animate-spin" : "group-hover:rotate-180"}`} />
          </button>
        </div>
      </div>

      {/* ── COLLAPSIBLE UPLOAD PANEL ── */}
      <AnimatePresence>
        {showUploadPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, height: "auto", y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0, y: -10, scale: 0.985 }}
            transition={{
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
              opacity: { duration: 0.25 },
            }}
            className="overflow-hidden mt-4"
          >
            <div className="rounded-2xl border-2 border-emerald-500/30 bg-card/95 p-4 sm:p-6 shadow-soft relative">
              {/* Info rule banner */}
              <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3.5 py-2 text-xs text-muted-foreground">
                <Info className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Maksimal durasi file video <strong>≤ 180 detik</strong> dan ukuran <strong>≤ 50 MB</strong> untuk tipe <strong>Upload</strong>.</span>
              </div>

              <div className="space-y-4">
                {/* Judul */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground">Judul Video</label>
                    <span
                      className={`text-[11px] font-semibold transition-colors ${
                        title.length >= MAX_TITLE_LENGTH
                          ? "text-destructive font-bold"
                          : title.length > 40
                          ? "text-sun font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {title.length}/{MAX_TITLE_LENGTH}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={title}
                    maxLength={MAX_TITLE_LENGTH}
                    disabled={uploading}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Masukan judul video disini..."
                    className="w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground dark:border-border/80 px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary shadow-xs disabled:opacity-50"
                  />
                </div>

                {/* Tab selector (File vs Link) — Full Width with smooth sliding indicator */}
                <div className="relative flex w-full gap-2 rounded-xl bg-secondary p-1">
                  {(["file", "link"] as const).map((tab) => {
                    const isActive = uploadTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        disabled={uploading}
                        onClick={() => {
                          setUploadTab(tab);
                          setUploadError(null);
                        }}
                        className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                          isActive
                            ? "text-foreground font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="uploadTabIndicator"
                            className="absolute inset-0 rounded-lg bg-card shadow-2xs"
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          {tab === "file" ? (
                            <>
                              <Upload className="size-3.5" /> Upload File
                            </>
                          ) : (
                            <>
                              <Link2 className="size-3.5" /> Tempel Link
                            </>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Content: File dropzone or Link input */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={uploadTab}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {uploadTab === "file" && (
                      <div
                        onDragOver={(e) => {
                          if (!uploading) {
                            e.preventDefault();
                            setDragOver(true);
                          }
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleFileDrop}
                        onClick={() => {
                          if (!uploading && fileInputRef.current) {
                            fileInputRef.current.click();
                          }
                        }}
                        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                          dragOver
                            ? "border-primary bg-primary/10"
                            : file
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : "border-border/80 hover:border-primary/50 hover:bg-secondary/40"
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={ACCEPT_TYPES}
                          onChange={handleFileSelect}
                          className="hidden"
                          disabled={uploading}
                        />
                        {file ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-5" />
                            </div>
                            <p className="text-xs font-bold text-foreground">{file.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB · Klik untuk mengganti file
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground group-hover:text-primary transition-colors">
                              <Film className="size-5" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">
                              Klik untuk pilih video atau drag &amp; drop ke sini
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              MP4, WebM, MOV (Maks. 50 MB, durasi ≤ 3 menit)
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {uploadTab === "link" && (
                      <div>
                        <input
                          type="url"
                          value={url}
                          disabled={uploading}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="Tempel tautan video disini..."
                          className="w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground dark:border-border/80 px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary shadow-xs disabled:opacity-50"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Mendukung Link : <strong>YouTube</strong> dan <strong>TikTok</strong>
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Progress Bar */}
                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                      <span>Mengunggah file...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error */}
                {uploadError && (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Submit button */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleTriggerSubmit}
                    disabled={uploading || !title.trim() || (uploadTab === "file" ? !file : !url.trim())}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-xs sm:text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-soft active:scale-95 whitespace-nowrap"
                  >
                    {uploading ? (
                      <RefreshCw className="size-4 shrink-0 animate-spin" />
                    ) : (
                      <Plus className="size-4 shrink-0" />
                    )}
                    <span className="leading-none">{uploading ? "Mengunggah video..." : "Unggah"}</span>
                  </button>
                  <button
                    onClick={() => setShowUploadPanel(false)}
                    className="rounded-xl border border-border/80 bg-secondary px-4 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TABS NAVBAR MENU ALA FRIEND CLUB ── */}
      <div className="mt-6 mb-6 flex gap-1.5 sm:gap-2 rounded-2xl border border-border/80 bg-card p-1.5 shadow-soft">
        <button
          onClick={() => setMainTab("gallery")}
          className={`relative flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
            mainTab === "gallery"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium"
          }`}
        >
          <div className="inline-flex items-center justify-center gap-1.5 min-w-0">
            <span className="truncate">Galeri</span>
            {hasGalleryNotif && mainTab !== "gallery" && (
              <span className="size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse shrink-0 ml-1" />
            )}
          </div>
        </button>

        <button
          onClick={() => {
            setMainTab("my_status");
            clearActivityNotif();
          }}
          className={`relative flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
            mainTab === "my_status"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium"
          }`}
        >
          <div className="inline-flex items-center justify-center gap-1.5 min-w-0">
            <span className="truncate">Aktivitas</span>
            {hasActivityNotif && mainTab !== "my_status" && (
              <span className="size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse shrink-0 ml-1" />
            )}
          </div>
        </button>

        {isAdmin && (
          <button
            onClick={() => setMainTab("admin")}
            className={`relative flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
              mainTab === "admin"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium"
            }`}
          >
            <span className="truncate">Moderasi Admin</span>
            {adminVideos.filter((v) => v.status === "pending").length > 0 && (
              <span
                className={`flex size-4 sm:size-5 shrink-0 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-bold ${
                  mainTab === "admin"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {adminVideos.filter((v) => v.status === "pending").length}
              </span>
            )}
            {adminVideos.some((v) => v.status === "pending") && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
            )}
          </button>
        )}
      </div>

      {/* ── TABS CONTENT WITH SMOOTH TRANSITION ── */}
      <AnimatePresence mode="wait">
        {/* ── TAB 1: GALERI TAYANG (GRID 5 KOLOM) ── */}
        {mainTab === "gallery" && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <section className="mt-4">
              {loadingVideos ? (
                <TreeSproutLoading message="Memuat..." />
              ) : displayedApproved.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon={Images}
                    title="Belum ada video tayang"
                    description="Belum ada video yang disetujui. Unggah video pertamamu sekarang!"
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3.5 sm:gap-4 items-start pt-3.5 pb-8">
                    {displayedApproved.map((v, index) => {
                      const yt = youtubeId(v.url);
                      const isFeatured = featuredId === v.id;
                      const isNew = v.status === "approved" && !seenApprovedIds.has(v.id);
                      const hasComment = Boolean(
                        (v.status === "approved" && v.approvalComment) ||
                        (v.status === "rejected" && v.reason)
                      );
                      const hasUnreadComment = hasComment && !readComments[v.id];

                      return (
                        <motion.div
                          key={v.id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{
                            y: expandedCardId === v.id ? 0 : -5,
                            transition: { duration: 0.2, ease: "easeOut" },
                          }}
                          transition={{
                            duration: 0.42,
                            delay: Math.min(index * 0.05, 0.3),
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className={`group relative flex flex-col ${
                            expandedCardId === v.id ? "z-20" : "z-10"
                          }`}
                        >
                          {/* Festive Ambient Party Glow Aura (Linear / Discord Inspired) */}
                          <div
                            className={`pointer-events-none absolute -inset-1 rounded-2xl transition-all duration-500 ${
                              isFeatured
                                ? "bg-gradient-to-br from-emerald-500/35 via-teal-400/25 via-amber-400/30 to-emerald-400/25 blur-md opacity-90 group-hover:opacity-100 group-hover:blur-lg"
                                : "bg-gradient-to-br from-emerald-500/15 via-teal-400/15 to-primary/15 blur-sm opacity-0 group-hover:opacity-75"
                            }`}
                          />

                          {/* Main Card Body */}
                          <div
                            className={`flex flex-col w-full overflow-hidden bg-card shadow-soft transition-[border-color,box-shadow] duration-200 ease-out border-2 ${
                              isFeatured
                                ? "border-emerald-500/50 dark:border-emerald-400/60 shadow-[0_0_20px_-4px_rgba(16,185,129,0.25)]"
                                : "border-border/80 dark:border-border/70"
                            } ${
                              expandedCardId === v.id
                                ? "rounded-t-xl rounded-b-none border-b-0 shadow-lg"
                                : "rounded-xl hover:border-leaf dark:hover:border-primary hover:shadow-[0_12px_32px_-8px_rgba(34,197,94,0.28)] dark:hover:shadow-[0_12px_32px_-8px_rgba(34,197,94,0.32)]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.currentTarget.blur();
                                setPreview(v);
                              }}
                              className="relative aspect-video w-full overflow-hidden bg-secondary cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 select-none"
                            >
                              <VideoThumbnail video={v} yt={yt} />
                              
                              {/* Party / Shimmer light sweep on hover */}
                              <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                              
                              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                                <Play className="size-9 text-white drop-shadow-lg opacity-0 transition-opacity group-hover:opacity-100" />
                              </span>
                              <SourceBadge source={v.sourceType} />

                              {/* Badge Tampil di Rumah Pohon (Animasi Lingkaran Hijau di Tengah Tanpa Teks) */}
                              {isFeatured && (
                                <span
                                  title="Sedang Tayang di Rumah Pohon"
                                  className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 z-10 flex size-5.5 sm:size-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-in fade-in"
                                >
                                  <span className="relative flex items-center justify-center">
                                    <span className="absolute size-3.5 rounded-full bg-emerald-400/50 animate-ping" />
                                    <span className="relative size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] ring-1.5 ring-emerald-500/30" />
                                  </span>
                                </span>
                              )}
                            </button>
                            
                            <div className="flex flex-1 flex-col p-3 pb-2">
                              <p className="line-clamp-1 text-xs sm:text-sm font-bold text-foreground" title={v.title}>{v.title}</p>
                              
                              {/* Date & Toggle Row (Linear / Notion Interactive Timestamp) */}
                              <div className="mt-0.5 flex items-center justify-between gap-1.5 flex-wrap w-full">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowActionTime(prev => ({ ...prev, [v.id]: !prev[v.id] }));
                                  }}
                                  title={showActionTime[v.id] ? "Klik untuk ganti ke Tanggal Diunggah" : "Klik untuk ganti ke Tanggal Disetujui"}
                                  className="group/time inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 -ml-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all cursor-pointer active:scale-95"
                                >
                                  <CurvedSwapIcon className="size-3 text-muted-foreground/70 group-hover/time:text-primary transition-transform duration-200 group-hover/time:scale-115 shrink-0" />
                                  <span className="tabular-nums">
                                    {showActionTime[v.id]
                                      ? `Disetujui ${timeAgo(v.approvedAt || v.submittedAt)}`
                                      : `Diunggah ${timeAgo(v.submittedAt)}`}
                                  </span>
                                </button>
                                {isNew && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                                    Baru
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t-2 border-border/80 dark:border-border/70">
                                <button
                                  onClick={() => toggleFeatured(v.id)}
                                  className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer text-center ${
                                    isFeatured
                                      ? "border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                      : "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/70"
                                  }`}
                                >
                                  {isFeatured ? "Stop Showing" : "Set as Show"}
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedCardId(expandedCardId === v.id ? null : v.id);
                                  }}
                                  title={expandedCardId === v.id ? "Tutup Pengaturan" : "Buka Pengaturan"}
                                  className={`relative rounded-lg p-1.5 transition-colors cursor-pointer shrink-0 ${
                                    expandedCardId === v.id 
                                      ? 'bg-primary/15 text-primary' 
                                      : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                  }`}
                                >
                                  <Settings className={`size-4 transition-transform duration-200 ${expandedCardId === v.id ? 'rotate-90' : ''}`} />
                                  {hasUnreadComment && (
                                    <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Overlapping Extension Menu ("Ditabrak" di atas elemen bawah) */}
                          <AnimatePresence>
                            {expandedCardId === v.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className={`absolute left-0 right-0 top-full z-20 rounded-b-xl border-2 border-t-0 bg-card p-2 pt-1.5 shadow-[0_16px_32px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.6)] ${
                                  isFeatured
                                    ? "border-emerald-500/50 dark:border-emerald-400/60"
                                    : "border-border/80 dark:border-border/70"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInfoVideo(v);
                                      setExpandedCardId(null);
                                    }}
                                    title="Informasi Detail"
                                    className="flex flex-1 items-center justify-center rounded-lg border border-border/80 bg-secondary/80 py-1.5 text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                  >
                                    <Info className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewCommentVideo(v);
                                      markCommentAsRead(v.id);
                                      setExpandedCardId(null);
                                    }}
                                    title="Catatan Admin"
                                    className="relative flex flex-1 items-center justify-center rounded-lg border border-border/80 bg-secondary/80 py-1.5 text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                  >
                                    <MessageSquare className="size-4" />
                                    {hasUnreadComment && (
                                      <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteTargetVideo(v);
                                      setExpandedCardId(null);
                                    }}
                                    title="Hapus Video"
                                    className="flex flex-1 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 py-1.5 text-destructive hover:bg-destructive/20 dark:border-destructive/40 dark:bg-destructive/15 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  {approved.length > 5 && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: displayedApproved.length * 0.07 + 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="flex justify-center pt-2"
                    >
                      <motion.button
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => navigate({ to: "/treegallery-all" })}
                        className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card px-5 py-2.5 text-xs font-bold text-foreground shadow-soft transition-colors hover:bg-secondary cursor-pointer"
                      >
                        <span>Lihat Seluruh Video</span>
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              )}
            </section>
          </motion.div>
        )}

        {/* ── TAB 2: STATUS MODERASI VIDEO SAYA ── */}
        {mainTab === "my_status" && (
          <motion.div
            key="my_status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <section className="mt-4">
              {/* Header Tab Aktivitas */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    Aktivitas Video Saya
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pantau status moderasi, tinjau catatan admin, dan kelola video yang kamu ajukan.
                  </p>
                </div>
              </div>

              {loadingVideos ? (
                <TreeSproutLoading message="Memuat aktivitas video..." />
              ) : myVideos.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Belum ada riwayat aktivitas"
                  description="Kamu belum pernah mengunggah video. Unggah video sekarang untuk melihat statusnya di sini."
                />
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3.5 sm:gap-4 items-start pt-3.5 pb-8">
                    {displayedMyVideos.map((v, index) => {
                      const meta = STATUS_META[v.status];
                      const Icon = meta.icon;
                      const yt = youtubeId(v.url);
                      const hasComment =
                        (v.status === "approved" && Boolean(v.approvalComment)) ||
                        (v.status === "rejected" && Boolean(v.reason));
                      const hasUnreadComment = hasComment && !readComments[v.id];

                      return (
                        <motion.div
                          key={v.id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{
                            y: expandedCardId === v.id ? 0 : -5,
                            transition: { duration: 0.2, ease: "easeOut" },
                          }}
                          transition={{
                            duration: 0.42,
                            delay: Math.min((index % 20) * 0.05, 0.3),
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className={`group relative flex flex-col ${
                            expandedCardId === v.id ? "z-20" : "z-10"
                          }`}
                        >
                          {/* Main Card Body (Always overflow-hidden to cleanly round top corners) */}
                          <div
                            className={`flex flex-col overflow-hidden bg-card shadow-soft transition-[border-color,box-shadow] duration-200 ease-out border-2 border-border/80 dark:border-border/70 ${
                              expandedCardId === v.id
                                ? "rounded-t-xl rounded-b-none border-b-0 shadow-lg"
                                : "rounded-xl hover:border-leaf dark:hover:border-primary hover:shadow-[0_12px_32px_-8px_rgba(34,197,94,0.28)] dark:hover:shadow-[0_12px_32px_-8px_rgba(34,197,94,0.32)]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.currentTarget.blur();
                                setPreview(v);
                              }}
                              className="relative aspect-video w-full overflow-hidden bg-secondary cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 select-none"
                            >
                              <VideoThumbnail video={v} yt={yt} />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                                <Play className="size-9 text-white drop-shadow-lg opacity-0 transition-opacity group-hover:opacity-100" />
                              </span>
                              <SourceBadge source={v.sourceType} />

                              {/* Status Icon Badge (Pojok Kiri Atas - Frosted Glass & Neon Accent) */}
                              <span
                                title={`Status: ${meta.label}`}
                                className={`absolute left-2 top-2 z-10 flex size-6.5 sm:size-7 items-center justify-center rounded-lg border backdrop-blur-md transition-transform duration-200 group-hover:scale-105 shadow-sm ${meta.cornerBadgeClass}`}
                              >
                                <Icon className="size-3.5 sm:size-4" />
                              </span>
                            </button>
                            
                            <div className="flex flex-1 flex-col p-3 pb-2">
                              <p className="line-clamp-1 text-xs sm:text-sm font-bold text-foreground" title={v.title}>{v.title}</p>
                              {/* Date & Toggle Row (Linear / Notion Interactive Timestamp) */}
                              <div className="mt-0.5 flex items-center justify-between gap-1.5 flex-wrap w-full">
                                <button
                                  type="button"
                                  disabled={v.status === "pending"}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (v.status !== "pending") {
                                      setShowActionTime(prev => ({ ...prev, [v.id]: !prev[v.id] }));
                                    }
                                  }}
                                  title={
                                    v.status === "pending"
                                      ? "Video dalam antrean moderasi"
                                      : showActionTime[v.id]
                                      ? "Klik untuk ganti ke Tanggal Diunggah"
                                      : `Klik untuk ganti ke Tanggal ${v.status === "approved" ? "Disetujui" : "Ditolak"}`
                                  }
                                  className={`group/time inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 -ml-1 text-[11px] text-muted-foreground transition-all ${
                                    v.status !== "pending"
                                      ? "hover:text-foreground hover:bg-secondary/70 cursor-pointer active:scale-95"
                                      : "cursor-default opacity-85"
                                  }`}
                                >
                                  <CurvedSwapIcon className={`size-3 text-muted-foreground/70 transition-transform duration-200 shrink-0 ${
                                    v.status !== "pending" ? "group-hover/time:text-primary group-hover/time:scale-115" : ""
                                  }`} />
                                  <span className="tabular-nums">
                                    {showActionTime[v.id] && v.status !== "pending"
                                      ? `${v.status === "approved" ? "Disetujui" : "Ditolak"} ${timeAgo(v.status === "approved" ? v.approvedAt || v.submittedAt : v.rejectedAt || v.submittedAt)}`
                                      : `Diunggah ${timeAgo(v.submittedAt)}`}
                                  </span>
                                </button>
                              </div>

                              <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t-2 border-border/80 dark:border-border/70">
                                {/* Status badge (Clean Text Pill) */}
                                <div
                                  className={`flex-1 min-w-0 inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold border transition-all duration-200 select-none text-center ${meta.badgeClass}`}
                                >
                                  <span className="truncate">{meta.label}</span>
                                </div>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedCardId(expandedCardId === v.id ? null : v.id);
                                  }}
                                  title={expandedCardId === v.id ? "Tutup Pengaturan" : "Buka Pengaturan"}
                                  className={`relative rounded-lg p-1.5 transition-colors cursor-pointer shrink-0 ${
                                    expandedCardId === v.id 
                                      ? 'bg-primary/15 text-primary' 
                                      : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                  }`}
                                >
                                  <Settings className={`size-4 transition-transform duration-200 ${expandedCardId === v.id ? 'rotate-90' : ''}`} />
                                  {hasUnreadComment && (
                                    <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Overlapping Extension Menu ("Ditabrak" di atas elemen bawah) */}
                          <AnimatePresence>
                            {expandedCardId === v.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className="absolute left-0 right-0 top-full z-20 rounded-b-xl border-2 border-t-0 border-border/80 dark:border-border/70 bg-card p-2 pt-1.5 shadow-[0_16px_32px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.6)]"
                              >
                                {v.status === "pending" ? (
                                  <div className="flex items-center gap-1.5">
                                    {/* Tombol Batalkan Pengajuan (Warna Merah Destructive) */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        cancelGalleryVideo(v.id);
                                        setExpandedCardId(null);
                                        loadData();
                                      }}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11px] sm:text-xs font-semibold text-destructive hover:bg-destructive/20 dark:border-destructive/40 dark:bg-destructive/15 dark:text-destructive dark:hover:bg-destructive/25 transition-colors cursor-pointer text-center"
                                    >
                                      <XCircle className="size-3.5 shrink-0" />
                                      <span className="truncate">Batalkan Pengajuan</span>
                                    </button>

                                    {/* Tombol Icon Hapus (Tanpa Teks) */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeleteTargetVideo(v);
                                        setExpandedCardId(null);
                                      }}
                                      title="Hapus Aktivitas"
                                      className="flex items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 dark:border-destructive/40 dark:bg-destructive/15 transition-colors cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-1.5">
                                    {/* 1. Icon Informasi */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInfoVideo(v);
                                        setExpandedCardId(null);
                                      }}
                                      title="Informasi Detail"
                                      className="flex flex-1 items-center justify-center rounded-lg border border-border/80 bg-secondary/80 py-1.5 text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                    >
                                      <Info className="size-4" />
                                    </button>

                                    {/* 2. Icon Catatan Admin */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setViewCommentVideo(v);
                                        markCommentAsRead(v.id);
                                        setExpandedCardId(null);
                                      }}
                                      title="Catatan Admin"
                                      className="relative flex flex-1 items-center justify-center rounded-lg border border-border/80 bg-secondary/80 py-1.5 text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                    >
                                      <MessageSquare className="size-4" />
                                      {hasUnreadComment && (
                                        <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                                      )}
                                    </button>

                                    {/* 3. Icon Hapus Aktivitas */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeleteTargetVideo(v);
                                        setExpandedCardId(null);
                                      }}
                                      title="Hapus Aktivitas"
                                      className="flex flex-1 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 py-1.5 text-destructive hover:bg-destructive/20 dark:border-destructive/40 dark:bg-destructive/15 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Infinite Scroll Sentinel & Loading Indicator */}
                  <div ref={activityObserverRef} className="w-full flex justify-center py-2">
                    {loadingMoreActivity && (
                      <TreeSproutLoading message="Memuat 20 video berikutnya..." />
                    )}
                  </div>
                </div>
              )}
            </section>
          </motion.div>
        )}

        {/* ── TAB 3: MODERASI ADMIN (Khusus Admin) ── */}
        {isAdmin && mainTab === "admin" && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <section className="mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    Panel Moderasi Admin
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tinjau dan kelola video yang diajukan oleh seluruh pengguna TreeNest.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-xl bg-secondary p-1">
                    <button
                      onClick={() => setAdminTab("pending")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                        adminTab === "pending"
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Menunggu ({adminVideos.filter((v) => v.status === "pending").length})
                    </button>
                    <button
                      onClick={() => setAdminTab("history")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                        adminTab === "history"
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Riwayat
                    </button>
                  </div>

                  {adminTab === "history" && adminVideos.length > 0 && (
                    <button
                      onClick={() => setShowClearHistoryModal(true)}
                      className="flex items-center gap-1 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" /> Hapus Semua
                    </button>
                  )}
                </div>
              </div>

              {/* Daftar Video Admin */}
              {adminVideos.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon={CheckCircle2}
                    title="Tidak ada video"
                    description={`Tidak ada video dalam kategori "${adminTab === "pending" ? "Menunggu Moderasi" : "Riwayat Video"}".`}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                  {adminVideos.map((v) => {
                    const yt = youtubeId(v.url);
                    const meta = STATUS_META[v.status];
                    const StatusIcon = meta.icon;
                    const uploader = uploaderProfiles[v.uid];
                    return (
                      <div
                        key={v.id}
                        className="flex flex-col gap-3 rounded-xl border-2 border-border/80 bg-card p-3.5 shadow-soft justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => setPreview(v)}
                            className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-secondary cursor-pointer"
                          >
                            <VideoThumbnail video={v} yt={yt} />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="size-6 text-white drop-shadow" />
                            </span>
                            <SourceBadge source={v.sourceType} small />
                          </button>

                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold w-fit ${meta.bg} ${meta.color}`}>
                              <StatusIcon className="size-3" />
                              {meta.label}
                            </span>

                            <p className="line-clamp-1 text-xs sm:text-sm font-bold text-foreground" title={v.title}>{v.title}</p>

                            {uploader ? (
                              <p className="text-[11px] font-semibold text-foreground">
                                Pengunggah:{" "}
                                <button
                                  type="button"
                                  onClick={() => setSelectedUploaderAccountId(uploader.accountId || uploader.uid)}
                                  className="font-bold text-primary hover:underline cursor-pointer"
                                >
                                  {uploader.username} ({uploader.accountId})
                                </button>
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">
                                UID:{" "}
                                <button
                                  type="button"
                                  onClick={() => setSelectedUploaderAccountId(v.uid)}
                                  className="font-mono text-primary hover:underline cursor-pointer"
                                >
                                  {v.uid}
                                </button>
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              Diajukan: {timeAgo(v.submittedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Catatan persetujuan / penolakan */}
                        {v.status === "approved" && v.approvalComment && (
                          <p className="rounded-lg bg-leaf/10 px-2.5 py-1 text-[11px] font-medium text-leaf">
                            Catatan Admin: {v.approvalComment}
                          </p>
                        )}
                        {v.status === "rejected" && v.reason && (
                          <p className="rounded-lg bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
                            Alasan Penolakan: {v.reason}
                          </p>
                        )}

                        {/* Tombol Aksi Moderasi */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                          {v.status === "pending" ? (
                            <>
                              <button
                                onClick={() => {
                                  setApproveTarget(v.id);
                                  setApprovalComment("");
                                }}
                                className="flex items-center gap-1 rounded-lg bg-leaf/15 px-3 py-1.5 text-xs font-bold text-leaf hover:bg-leaf/25 transition-colors cursor-pointer"
                              >
                                <Check className="size-3.5" /> Setujui
                              </button>
                              <button
                                onClick={() => {
                                  setRejectTarget(v.id);
                                  setRejectReason("");
                                }}
                                className="flex items-center gap-1 rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/25 transition-colors cursor-pointer"
                              >
                                <X className="size-3.5" /> Tolak
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setAdminDeletingId(v.id)}
                              title="Hapus Video dari Riwayat"
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL KONFIRMASI UPLOAD ── */}
      {showConfirmUpload && (
        <div
          onClick={() => setShowConfirmUpload(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-float text-center space-y-4"
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <AlertTriangle className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Konfirmasi Upload Video</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Apakah Anda yakin ingin mengunggah video <strong>"{title.trim()}"</strong> untuk
                dimoderasi Admin?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={executeUpload}
                className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Ya, Upload Video
              </button>
              <button
                onClick={() => setShowConfirmUpload(false)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary/70"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PREVIEW ── */}
      {preview && <VideoPlayerModal video={preview} onClose={() => setPreview(null)} />}

      {/* ── MODAL KOMENTAR PERSETUJUAN (Opsional) ── */}
      {approveTarget && (
        <div
          onClick={() => setApproveTarget(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-float"
          >
            <p className="mb-5 text-base font-bold text-foreground text-center">Komentar Persetujuan (Opsional)</p>
            <textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Komentar Persetujuan"
              rows={3}
              className="w-full resize-none rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleApproveConfirm}
                className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Konfirmasi Setujui
              </button>
              <button
                onClick={() => setApproveTarget(null)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary/70"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REJECT ── */}
      {rejectTarget && (
        <div
          onClick={() => setRejectTarget(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-float"
          >
            <p className="mb-3 text-base font-bold text-foreground">Alasan Penolakan Video</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Durasi video melebihi 30 detik atau konten tidak sesuai."
              rows={3}
              className="w-full resize-none rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleRejectConfirm}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-white transition-colors hover:bg-destructive/90"
              >
                Konfirmasi Tolak
              </button>
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary/70"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL LIHAT CATATAN ADMIN UNTUK USER ── */}
      {viewCommentVideo && (
        <div
          onClick={() => setViewCommentVideo(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg sm:max-w-xl overflow-hidden rounded-xl border border-border/80 bg-card p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div>
              <h3 className="text-base font-bold text-foreground">Catatan Moderasi Admin</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Video: <strong className="text-foreground">"{viewCommentVideo.title}"</strong>
              </p>
            </div>

            {/* Note Box — Full Kotak dengan Border & Teks Hitam (Light) / Putih (Dark) */}
            <div className={`rounded-xl border border-black dark:border-white p-4 text-left shadow-xs transition-all ${
              viewCommentVideo.status === "approved"
                ? "text-black dark:text-white"
                : viewCommentVideo.status === "rejected"
                ? "text-black dark:text-white"
                : "text-black dark:text-white"
            }`}>
              {viewCommentVideo.status === "approved" ? (
                viewCommentVideo.approvalComment ? (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-black dark:text-white">
                      Catatan Persetujuan Admin:
                    </p>
                    <p className="mt-1 text-xs font-semibold text-black dark:text-white leading-relaxed">
                      "{viewCommentVideo.approvalComment}"
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-black dark:text-white text-center whitespace-nowrap overflow-hidden text-ellipsis">
                    Admin tidak memberikan catatan khusus untuk persetujuan video ini.
                  </p>
                )
              ) : viewCommentVideo.status === "rejected" ? (
                viewCommentVideo.reason ? (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-black dark:text-white">
                      Alasan Penolakan Admin:
                    </p>
                    <p className="mt-1 text-xs font-semibold text-black dark:text-white leading-relaxed">
                      "{viewCommentVideo.reason}"
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-black dark:text-white text-center whitespace-nowrap overflow-hidden text-ellipsis">
                    Admin tidak mencantumkan alasan penolakan spesifik.
                  </p>
                )
              ) : (
                <p className="text-xs font-semibold text-black dark:text-white text-center whitespace-nowrap overflow-hidden text-ellipsis">
                  Video Anda sedang dalam antrean moderasi Admin.
                </p>
              )}
            </div>

            <button
              onClick={() => setViewCommentVideo(null)}
              className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer shadow-soft active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL INFORMASI VIDEO ── */}
      {infoVideo && (
        <div
          onClick={() => setInfoVideo(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-float animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3 mb-4 border-b border-border/60 pb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                <Info className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Informasi Video</h3>
                <p className="text-[11px] font-medium text-muted-foreground">Detail pengajuan video</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Judul Video</p>
                <p className="text-sm font-semibold text-foreground line-clamp-2">{infoVideo.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Status</p>
                  <p className={`text-xs font-bold ${
                    infoVideo.status === 'approved' ? 'text-emerald-600' :
                    infoVideo.status === 'rejected' ? 'text-destructive' :
                    infoVideo.status === 'cancelled' ? 'text-muted-foreground' : 'text-amber-500'
                  }`}>
                    {infoVideo.status === 'approved' ? 'Disetujui' :
                     infoVideo.status === 'rejected' ? 'Ditolak' :
                     infoVideo.status === 'cancelled' ? 'Dibatalkan' : 'Menunggu Moderasi'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Sumber</p>
                  <p className="text-xs font-semibold text-foreground capitalize">{infoVideo.sourceType}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Waktu Diunggah</p>
                <p className="text-xs font-medium text-foreground">
                  {new Date(infoVideo.submittedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {infoVideo.status !== 'pending' && infoVideo.status !== 'cancelled' && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Waktu Tindakan Admin</p>
                  <p className="text-xs font-medium text-foreground">
                    {infoVideo.status === 'approved' && infoVideo.approvedAt ? 
                      new Date(infoVideo.approvedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 
                     infoVideo.status === 'rejected' && infoVideo.rejectedAt ? 
                      new Date(infoVideo.rejectedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 
                      '-'
                    }
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setInfoVideo(null)}
              className="w-full rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary/70 cursor-pointer shadow-soft active:scale-95 border border-border/60"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI HAPUS SEMUA RIWAYAT VIDEO ── */}
      {showClearHistoryModal && (
        <div
          onClick={() => setShowClearHistoryModal(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
              <Trash2 className="size-6" />
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
                className="flex-1 rounded-xl border border-border/80 bg-secondary/80 text-secondary-foreground dark:bg-secondary dark:text-foreground py-2.5 text-xs font-bold transition-colors hover:bg-secondary/60 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI HAPUS RIWAYAT VIDEO (Admin) ── */}
      {adminDeletingId && (
        <div
          onClick={() => setAdminDeletingId(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
              <Trash2 className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Hapus Riwayat Video?</h3>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={confirmAdminDelete}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-white transition-colors hover:bg-destructive/90 cursor-pointer shadow-soft"
              >
                Ya, Hapus
              </button>
              <button
                onClick={() => setAdminDeletingId(null)}
                className="flex-1 rounded-xl border border-border/80 bg-secondary/80 text-secondary-foreground dark:bg-secondary dark:text-foreground py-2.5 text-xs font-bold transition-colors hover:bg-secondary/60 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI HAPUS VIDEO CUSTOM (Light & Dark Mode) ── */}
      {deleteTargetVideo && (
        <div
          onClick={() => setDeleteTargetVideo(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
              <Trash2 className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Hapus Video Ini?</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Apakah Anda yakin ingin menghapus video <strong>"{deleteTargetVideo.title}"</strong> dari galeri?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={async () => {
                  const target = deleteTargetVideo;
                  setDeleteTargetVideo(null);
                  await handleDelete(target.id);
                }}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-white transition-colors hover:bg-destructive/90 cursor-pointer shadow-soft"
              >
                Hapus
              </button>
              <button
                onClick={() => setDeleteTargetVideo(null)}
                className="flex-1 rounded-xl border border-border/80 bg-secondary/80 text-secondary-foreground dark:bg-secondary dark:text-foreground py-2.5 text-xs font-bold transition-colors hover:bg-secondary/60 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ── Helper Components ──────────────────────────────────────────────

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
      fetchTikTokThumbnail(video.url).then((thumbUrl: string | null) => {
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
        src={`https://i.ytimg.com/vi/${yt}/mqdefault.jpg`}
        alt={video.title}
        referrerPolicy="no-referrer"
        loading="lazy"
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  if (tiktokThumb) {
    return (
      <img
        src={tiktokThumb}
        alt={video.title}
        referrerPolicy="no-referrer"
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

  const colors: Record<string, string> = {
    tiktok: "from-pink-500/20 to-cyan-500/20",
    upload: "from-leaf/15 to-sky/15",
    link: "from-primary/10 to-muted/20",
  };
  const gradient = colors[video.sourceType] ?? colors["link"];
  return (
    <div className={`flex size-full items-center justify-center bg-gradient-to-br ${gradient}`}>
      <Film className="size-8 text-muted-foreground/60" />
    </div>
  );
}

function SourceBadge({ source, small }: { source: string; small?: boolean }) {
  const label = SOURCE_LABEL[source] ?? "Link";
  if (small) {
    return (
      <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
        {label}
      </span>
    );
  }
  return (
    <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
      {label}
    </span>
  );
}

// PreviewModal has been replaced by the shared VideoPlayerModal component.
// See: src/components/VideoPlayerModal.tsx

function CurvedSwapIcon({ className = "size-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top arrow: gentle curve up from left to right with ample vertical breathing room */}
      <path d="M4 11a4 4 0 0 1 4-4h12" />
      <path d="m16.5 3.5 3.5 3.5-3.5 3.5" />
      {/* Bottom arrow: gentle curve down from right to left with exact symmetrical spacing */}
      <path d="M20 13a4 4 0 0 1-4 4H4" />
      <path d="m7.5 13.5-3.5 3.5 3.5 3.5" />
    </svg>
  );
}

function TreeSproutLoading({ message = "Menyiapkan video..." }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-20 sm:py-24 select-none"
    >
      {/* Minimalist Nature/Sprout Living Icon */}
      <div className="relative flex items-center justify-center size-20">
        {/* Soft Ambient Radial Halo Glow */}
        <motion.div
          animate={{
            scale: [0.9, 1.15, 0.9],
            opacity: [0.2, 0.45, 0.2],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute size-16 rounded-full bg-emerald-500/20 blur-xl dark:bg-emerald-400/20"
        />

        {/* Minimalist Tree Sprout SVG */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative size-12 drop-shadow-[0_4px_14px_rgba(16,185,129,0.35)]"
        >
          {/* Ground Soil Arc / Ripple */}
          <motion.path
            d="M12 42C18 40.5 30 40.5 36 42"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-emerald-500/30 dark:text-emerald-400/30"
            animate={{
              opacity: [0.25, 0.65, 0.25],
              scaleX: [0.94, 1.06, 0.94],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "24px 42px" }}
          />

          {/* Animated Sprout Plant Group (Gentle organic breeze sway) */}
          <motion.g
            animate={{
              rotate: [-3.5, 3.5, -3.5],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "24px 41px" }}
          >
            {/* Sprout Main Stem */}
            <path
              d="M24 41V22C24 16.5 26.5 12.5 29 9"
              stroke="url(#sprout-stem-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Left Leaf Petal */}
            <motion.path
              d="M24 25C15 25 12 18 13 12C20 12 24 18 24 25Z"
              fill="url(#sprout-leaf-left)"
              animate={{
                rotate: [-6, 6, -6],
                scale: [0.94, 1.06, 0.94],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "24px 25px" }}
            />

            {/* Right Leaf Petal (Top Bud) */}
            <motion.path
              d="M24 17C33 16 36 9 34 3C27 4 24 10 24 17Z"
              fill="url(#sprout-leaf-right)"
              animate={{
                rotate: [6, -6, 6],
                scale: [1.06, 0.94, 1.06],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "24px 17px" }}
            />
          </motion.g>

          {/* Gradients */}
          <defs>
            <linearGradient id="sprout-stem-grad" x1="24" y1="41" x2="24" y2="9" gradientUnits="userSpaceOnUse">
              <stop stopColor="#059669" />
              <stop offset="1" stopColor="#34D399" />
            </linearGradient>
            <linearGradient id="sprout-leaf-left" x1="12" y1="12" x2="24" y2="25" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10B981" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="sprout-leaf-right" x1="24" y1="3" x2="36" y2="17" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34D399" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating Dew / Growth Micro-particles (Smooth seamless loop) */}
        {[
          { x: -14, y: -6, duration: 2.2, delay: 0 },
          { x: 16, y: -12, duration: 2.6, delay: 0.8 },
          { x: 0, y: -18, duration: 2.4, delay: 1.4 },
        ].map((pt, idx) => (
          <motion.span
            key={idx}
            className="absolute size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] dark:bg-emerald-300 pointer-events-none"
            style={{ left: `calc(50% + ${pt.x}px)`, top: `calc(50% + ${pt.y}px)` }}
            animate={{
              y: [0, -12, -24],
              opacity: [0, 0.9, 0],
              scale: [0.5, 1.15, 0.4],
            }}
            transition={{
              duration: pt.duration,
              repeat: Infinity,
              delay: pt.delay,
              ease: "easeInOut",
              times: [0, 0.5, 1],
            }}
          />
        ))}
      </div>

      {/* Modern, calm typography */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="mt-3 text-xs font-medium tracking-wide text-muted-foreground/80 dark:text-muted-foreground/70"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}
