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
  ExternalLink,
  Check,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
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
  approved: { label: "Disetujui", icon: CheckCircle2, color: "text-leaf", bg: "bg-leaf/10" },
  pending: { label: "Menunggu Moderasi", icon: Clock, color: "text-sun", bg: "bg-sun/15" },
  rejected: { label: "Ditolak", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
} as const;

const ACCEPT_TYPES = "video/mp4,video/webm,video/quicktime,video/ogg";
const MAX_FILE_MB = 50;

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
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);

  const isAnyModalOpen = Boolean(
    showConfirmUpload ||
    approveTarget ||
    rejectTarget ||
    preview ||
    viewCommentVideo ||
    selectedUploaderAccountId ||
    deleteTargetVideo ||
    showClearHistoryModal
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

  // ─── Derived ──────────────────────────────────────────────────────
  const approved = useMemo(() => myVideos.filter((v) => v.status === "approved"), [myVideos]);
  const displayedApproved = useMemo(() => approved.slice(0, 3), [approved]);
  const myNonApproved = useMemo(() => myVideos.filter((v) => v.status !== "approved"), [myVideos]);
  const canUpload = true;

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

  async function handleAdminDelete(videoId: string) {
    if (confirm("Apakah Anda yakin ingin menghapus video ini dari galeri?")) {
      await deleteGalleryVideoAdmin(videoId);
      await loadData();
    }
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
    }
    setRejectTarget(null);
    setRejectReason("");
    await loadData();
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <PageShell
      title="TreeGallery"
      description="Silakan pilih video. Video akan tayang setelah disetujui Admin."
    >
      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-3xl border-2 border-white bg-gradient-to-br from-sky/15 to-cloud/40 p-4 shadow-soft">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-deep" />
        <div className="text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Aturan &amp; Penjelasan singkat</p>
          <p className="mt-0.5">
            · Silahkan pilih video (≤ 180 detik untuk tipe File Upload).<br></br> · Video tayang setelah moderasi Admin. <br></br>· Pilih 1 video untuk Rumah Pohon setiap harinya dan buat streak Anda!
          </p>
        </div>
      </div>

      {/* ── UPLOAD FORM ── */}
      <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <Images className="size-4" /> Unggah Video
        </h2>

        {!canUpload ? (
          <p className="text-sm text-muted-foreground">
            Slot video penuh ({myVideos.length}/{MAX_VIDEOS}). Hapus salah satu untuk menambah baru.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Judul */}
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                Judul Video
              </label>
              <input
                type="text"
                value={title}
                disabled={uploading}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ketik Judul Video Anda disini..."
                className="w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Tab selector */}
            <div className="flex gap-2 rounded-xl bg-secondary p-1">
              {(["file", "link"] as const).map((tab) => (
                <button
                  key={tab}
                  disabled={uploading}
                  onClick={() => {
                    setUploadTab(tab);
                    setUploadError(null);
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    uploadTab === tab
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "file" ? (
                    <>
                      <Upload className="size-3.5" /> Upload File
                    </>
                  ) : (
                    <>
                      <Link2 className="size-3.5" /> Tempel Link
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* File upload / Link tab contents with Motion */}
            <AnimatePresence mode="wait">
              <motion.div
                key={uploadTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
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
                      if (!uploading) fileInputRef.current?.click();
                    }}
                    className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors ${
                      uploading
                        ? "cursor-not-allowed opacity-50 border-border bg-secondary/20"
                        : dragOver
                          ? "cursor-pointer border-primary bg-primary/5"
                          : file
                            ? "cursor-pointer border-leaf/60 bg-leaf/5"
                            : "cursor-pointer border-border/60 bg-secondary/40 hover:border-primary/60 hover:bg-primary/5"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT_TYPES}
                      disabled={uploading}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {file ? (
                      <>
                        <Film className="size-7 text-leaf" />
                        <p className="text-center text-sm font-semibold text-leaf">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                        {!uploading && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                            }}
                            className="mt-1 text-xs text-muted-foreground underline hover:text-destructive"
                          >
                            Ganti file / Batalkan
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <Upload className="size-7 text-muted-foreground/60" />
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Klik</span> atau seret file
                          video ke sini
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MP4, WebM, MOV · Maks. {MAX_FILE_MB}MB
                        </p>
                      </>
                    )}
                  </div>
                )}

                {uploadTab === "link" && (
                  <div className="space-y-2">
                    <label className="mb-1 block text-xs font-bold text-muted-foreground">
                      URL Video / Tautan
                    </label>
                    <input
                      value={url}
                      disabled={uploading}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://youtube.com/... atau https://tiktok.com/..."
                      className="w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      Mendukung: YouTube, TikTok, Instagram Reels, atau URL video langsung lainnya.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Progress */}
            {uploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Mengunggah video ke server...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {uploadError && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {uploadError}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleTriggerSubmit}
              disabled={uploading || !title.trim() || (uploadTab === "file" ? !file : !url.trim())}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {uploading ? "Mengunggah..." : "Upload video"}
            </button>
          </div>
        )}
      </div>

      {/* Refresh button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={loadData}
          disabled={loadingVideos || uploading}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loadingVideos ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* ── GALERI VIDEO DISETUJUI (Tayang) ── */}
      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Galeri Tayang
        </h2>
        {approved.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={Images}
              title="Belum ada video tayang"
              description="Video yang disetujui Admin akan muncul di sini."
            />
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedApproved.map((v) => {
                const yt = youtubeId(v.url);
                const isFeatured = featuredId === v.id;
                return (
                  <div
                    key={v.id}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-border/80 bg-card shadow-soft dark:border-border/70 hover:border-primary/50 transition-all"
                  >
                    <button
                      onClick={() => setPreview(v)}
                      className="relative aspect-video w-full overflow-hidden bg-secondary cursor-pointer"
                    >
                      <VideoThumbnail video={v} yt={yt} />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                        <Play className="size-10 text-white drop-shadow-lg opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                      <SourceBadge source={v.sourceType} />
                    </button>
                    <div className="flex flex-1 flex-col p-3">
                      <p className="line-clamp-1 text-sm font-bold text-foreground">{v.title}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(v.submittedAt)}</p>

                      {/* Status Informasi Rumah Pohon */}
                      {isFeatured ? (
                        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-leaf text-center">
                          
                          <span>Tampil di Rumah Pohon</span>
                          
                        </div>
                      ) : (
                        <div className="mt-2 h-4" />
                      )}

                      <div className="mt-2 flex items-center gap-2 pt-2 border-t border-border/40">
                        <button
                          onClick={() => toggleFeatured(v.id)}
                          className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                            isFeatured
                              ? "border border-border/80 bg-secondary/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                          }`}
                        >
                          {isFeatured ? "Hentikan Tayangan" : "Jadikan Tayangan"}
                        </button>
                        
                        {/* Tombol Catatan Admin */}
                        <button
                          onClick={() => {
                            setViewCommentVideo(v);
                            markCommentAsRead(v.id);
                          }}
                          title="Lihat Catatan Admin"
                          className="relative rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <MessageSquare className="size-4" />
                          {/* Red dot badge jika ada catatan admin yang belum dibaca */}
                          {((v.status === "approved" && v.approvalComment) || (v.status === "rejected" && v.reason)) && !readComments[v.id] && (
                            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                          )}
                        </button>

                        <button
                          onClick={() => setDeleteTargetVideo(v)}
                          aria-label="Hapus video"
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol Tampilkan Lainnya jika ada video tambahan atau untuk membuka semua video */}
            {approved.length > 3 && (
              <button
                onClick={() => navigate({ to: "/treegallery-all" })}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border/80 bg-white text-foreground dark:border-border/60 dark:bg-slate-900/80 dark:text-foreground py-3 text-xs font-bold shadow-soft transition-all hover:bg-secondary hover:border-primary/40 dark:hover:bg-slate-800 dark:hover:border-emerald-400/50 hover:scale-[1.008] active:scale-[0.98] cursor-pointer group"
              >
                <span>Tampilkan Lainnya</span> <ChevronDown className="size-4 text-primary group-hover:translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── STATUS MODERASI USER SENDER ── */}
      {myNonApproved.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Status Moderasi Video Saya
          </h2>
          <div className="mt-3 space-y-2">
            {myNonApproved.map((v) => {
              const meta = STATUS_META[v.status];
              const Icon = meta.icon;
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3"
                >
                  <span className={`flex size-9 items-center justify-center rounded-xl ${meta.bg}`}>
                    <Icon className={`size-4.5 ${meta.color}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-foreground">{v.title}</p>
                    <p className={`text-xs ${meta.color}`}>{meta.label}</p>
                    {v.status === "rejected" && v.reason && (
                      <p className="text-xs text-muted-foreground">Alasan: {v.reason}</p>
                    )}
                  </div>
                  <SourceBadge source={v.sourceType} small />

                  {/* Tombol Catatan Admin untuk Video Belum Disetujui/Ditolak */}
                  <button
                    onClick={() => {
                      setViewCommentVideo(v);
                      markCommentAsRead(v.id);
                    }}
                    title="Lihat Catatan Admin"
                    className="relative rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <MessageSquare className="size-4" />
                    {((v.status === "approved" && v.approvalComment) || (v.status === "rejected" && v.reason)) && !readComments[v.id] && (
                      <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                    )}
                  </button>

                  <button
                    onClick={() => setDeleteTargetVideo(v)}
                    aria-label="Hapus video"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── PANEL ADMIN — PANEL MODERASI & RIWAYAT TAB ── */}
      {isAdmin && (
        <section className="mt-10 rounded-3xl border-2 border-primary/40 dark:border-primary/20 bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 dark:border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-sky-deep" />
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Panel Moderasi Admin TreeGallery
                </h2>
                <p className="text-xs text-muted-foreground">
                  Kelola seluruh video dari semua pengguna.
                </p>
              </div>
            </div>
            {/* Tombol Pintasan ke Halaman Khusus Moderasi Admin (Styling solid persis halaman Account) */}
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="size-4" />
              Buka Panel Moderasi Admin
              <ExternalLink className="size-3.5" />
            </button>
          </div>

          {/* Tab Filter Admin & Action Hapus Semua Riwayat Video */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {[
                { key: "pending", label: "Menunggu Moderasi" },
                { key: "history", label: "Riwayat Video" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAdminTab(tab.key as "pending" | "history")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    adminTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {adminTab === "history" && adminVideos.length > 0 && (
              <button
                onClick={() => setShowClearHistoryModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-1.5 text-xs font-bold text-destructive shadow-soft transition-all hover:bg-destructive hover:text-white active:scale-95 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Hapus Semua Riwayat Video</span>
              </button>
            )}
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
            <div className="mt-4 space-y-3">
              {adminVideos.map((v) => {
                const yt = youtubeId(v.url);
                const meta = STATUS_META[v.status];
                const StatusIcon = meta.icon;
                const uploader = uploaderProfiles[v.uid];
                return (
                  <div
                    key={v.id}
                    className="flex flex-col gap-3 rounded-2xl border-2 border-border/80 bg-background dark:border-border/60 dark:bg-secondary/40 p-3.5 sm:flex-row sm:items-center"
                  >
                    {/* Thumbnail */}
                    <button
                      onClick={() => setPreview(v)}
                      className="relative aspect-video w-full overflow-hidden rounded-xl bg-secondary sm:w-32 sm:shrink-0"
                    >
                      <VideoThumbnail video={v} yt={yt} />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play className="size-6 text-white drop-shadow" />
                      </span>
                      <SourceBadge source={v.sourceType} />
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}
                        >
                          <StatusIcon className="size-3" />
                          {meta.label}
                        </span>
                      </div>

                      <p className="line-clamp-1 text-sm font-bold text-foreground">{v.title}</p>

                      {/* Username & ID Akun Pengunggah (Bisa diklik untuk buka PublicProfileModal) */}
                      {uploader ? (
                        <p className="text-xs font-semibold text-foreground">
                          Pengunggah:{" "}
                          <button
                            type="button"
                            onClick={() => setSelectedUploaderAccountId(uploader.accountId || uploader.uid)}
                            className="font-bold text-primary hover:underline"
                          >
                            {uploader.username} ({uploader.accountId})
                          </button>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          UID Pengunggah:{" "}
                          <button
                            type="button"
                            onClick={() => setSelectedUploaderAccountId(v.uid)}
                            className="font-mono text-primary hover:underline"
                          >
                            {v.uid}
                          </button>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Diunggah: {timeAgo(v.submittedAt)}
                      </p>

                      {/* Catatan persetujuan jika ada */}
                      {v.status === "approved" && v.approvalComment && (
                        <p className="mt-1 rounded-xl bg-leaf/10 px-2.5 py-1.5 text-xs font-medium text-leaf">
                          Catatan Admin: {v.approvalComment}
                        </p>
                      )}
                      {/* Alasan penolakan jika ada */}
                      {v.status === "rejected" && v.reason && (
                        <p className="mt-1 text-xs text-destructive">Alasan Penolakan: {v.reason}</p>
                      )}
                    </div>

                    {/* Tombol Aksi — HANYA tampil jika video masih pending */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {v.status === "pending" && (
                        <>
                          <button
                            onClick={() => {
                              setApproveTarget(v.id);
                              setApprovalComment("");
                            }}
                            className="flex items-center gap-1 rounded-lg bg-leaf/10 px-2.5 py-1.5 text-xs font-semibold text-leaf transition-colors hover:bg-leaf/20"
                          >
                            <Check className="size-3.5" /> Setujui
                          </button>
                          <button
                            onClick={() => {
                              setRejectTarget(v.id);
                              setRejectReason("");
                            }}
                            className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                          >
                            <X className="size-3.5" /> Tolak
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleAdminDelete(v.id)}
                        title="Hapus dari Database"
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── MODAL KONFIRMASI UPLOAD ── */}
      {showConfirmUpload && (
        <div
          onClick={() => setShowConfirmUpload(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 shadow-float text-center space-y-4"
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
      {preview && <PreviewModal video={preview} onClose={() => setPreview(null)} />}

      {/* ── MODAL KOMENTAR PERSETUJUAN (Opsional) ── */}
      {approveTarget && (
        <div
          onClick={() => setApproveTarget(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 shadow-float"
          >
            <p className="mb-1 text-base font-bold text-foreground">Komentar Persetujuan (Opsional)</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Tuliskan catatan positif untuk pemilik video (opsional). Kosongkan jika tidak diperlukan.
            </p>
            <textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Contoh: Keren banget videonya! Tetap semangat berkarya."
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
            className="w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 shadow-float"
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
            className="w-full max-w-md sm:max-w-lg overflow-hidden rounded-xl border border-border/80 bg-card p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
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
                ? "bg-emerald-50/90 text-black dark:bg-emerald-950/40 dark:text-white"
                : viewCommentVideo.status === "rejected"
                ? "bg-rose-50/90 text-black dark:bg-rose-950/40 dark:text-white"
                : "bg-amber-50/90 text-black dark:bg-amber-950/40 dark:text-white"
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

      {/* ── MODAL KONFIRMASI HAPUS SEMUA RIWAYAT VIDEO ── */}
      {showClearHistoryModal && (
        <div
          onClick={() => setShowClearHistoryModal(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
              <Trash2 className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Hapus Semua Riwayat Video?</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Tindakan ini akan menghapus <strong>seluruh riwayat video</strong> (disetujui & ditolak) secara permanen dari database. Tindakan ini tidak dapat dibatalkan.
              </p>
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

      {/* ── MODAL KONFIRMASI HAPUS VIDEO CUSTOM (Light & Dark Mode) ── */}
      {deleteTargetVideo && (
        <div
          onClick={() => setDeleteTargetVideo(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
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
                Ya, Hapus Video
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

const SOURCE_LABEL: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  upload: "File Upload",
  link: "Tautan Link",
};

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

function PreviewModal({ video, onClose }: { video: GalleryVideo; onClose: () => void }) {
  const yt = youtubeId(video.url);
  const isTikTok = video.sourceType === "tiktok";
  const ttId = isTikTok ? tiktokId(video.url) : null;
  const [resolvedPlayUrl, setResolvedPlayUrl] = useState<string>(video.url);

  useEffect(() => {
    let active = true;
    resolveVideoUrl(video.url, video.id).then((u) => {
      if (active && u) setResolvedPlayUrl(u);
    });
    return () => {
      active = false;
    };
  }, [video.url, video.id]);

  function renderPlayer() {
    if (yt) {
      return (
        <div className="aspect-video w-full bg-black">
          <iframe
            className="size-full"
            src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (isTikTok) {
      const playerSrc = ttId
        ? `https://www.tiktok.com/player/v1/${ttId}?music_info=0&description=0&controls=1&rel=0&native_context_menu=0&closed_caption=0`
        : null;
      if (!playerSrc) {
        return (
          <div className="flex aspect-[9/16] max-h-[65vh] w-full items-center justify-center bg-black">
            <a href={video.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-foreground">
              <ExternalLink className="size-4" /> Buka di TikTok
            </a>
          </div>
        );
      }
      return (
        <div className="w-full bg-black overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '65vh' }}>
          <iframe
            className="size-full border-0"
            src={playerSrc}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    if (video.sourceType === "upload") {
      return (
        <div className="aspect-video w-full bg-black">
          <video
            className="size-full"
            src={resolvedPlayUrl || video.url}
            controls
            autoPlay
            controlsList="nodownload"
          />
        </div>
      );
    }

    return (
      <div className="flex aspect-video w-full items-center justify-center bg-secondary">
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <ExternalLink className="size-4" /> Buka Tautan
        </a>
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl animate-in zoom-in-95 duration-150 ${
          isTikTok ? "max-w-sm sm:max-w-[390px]" : "max-w-2xl"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <SourceBadge source={video.sourceType} small />
            <p className="line-clamp-1 text-sm font-bold text-foreground">{video.title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="ml-2 shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
        {renderPlayer()}
        <div className="flex items-center justify-between border-t border-border/60 bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Diunggah {timeAgo(video.submittedAt)}
          </p>
          {isTikTok && (
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors"
            >
              <ExternalLink className="size-3.5" /> Buka di TikTok
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
