import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
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
  setFeaturedVideo,
  getFeaturedVideoId,
} from "@/lib/firestore-service";
import {
  MAX_VIDEOS,
  MAX_DURATION_SEC,
  youtubeId,
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
          "Unggah maksimal tiga video berdurasi 30 detik, tunggu moderasi Admin, lalu pamerkan satu video di Rumah Pohon.",
      },
      { property: "og:title", content: "TreeGallery — Pamerkan Videomu" },
      {
        property: "og:description",
        content: "Galeri video pribadi dengan moderasi Admin di TreeNest.",
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
  const { profile } = useAuth();
  const isAdmin = useIsAdmin();
  const uid = profile?.uid ?? "guest";

  const [myVideos, setMyVideos] = useState<GalleryVideo[]>([]);
  const [adminVideos, setAdminVideos] = useState<GalleryVideo[]>([]);
  const [adminTab, setAdminTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
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

  // Modals
  const [showConfirmUpload, setShowConfirmUpload] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [preview, setPreview] = useState<GalleryVideo | null>(null);

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
    }
    setLoadingVideos(false);
  }, [uid, isAdmin, adminTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Derived ──────────────────────────────────────────────────────
  const approved = useMemo(() => myVideos.filter((v) => v.status === "approved"), [myVideos]);
  const myNonApproved = useMemo(() => myVideos.filter((v) => v.status !== "approved"), [myVideos]);
  const canUpload = myVideos.length < MAX_VIDEOS;

  // ─── File handling ────────────────────────────────────────────────
  function handleFileDrop(e: React.DragEvent) {
    if (uploading) return;
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith("video/")) {
      setFile(dropped);
      setUploadError(null);
    } else {
      setUploadError("Hanya file video yang diterima (MP4, WebM, MOV).");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (uploading) return;
    const selected = e.target.files?.[0] ?? null;
    if (selected) {
      if (selected.size > MAX_FILE_MB * 1024 * 1024) {
        setUploadError(`Ukuran file maksimal ${MAX_FILE_MB}MB.`);
        return;
      }
      setFile(selected);
      setUploadError(null);
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

    try {
      if (uploadTab === "file") {
        if (!file) {
          setUploadError("Pilih file video terlebih dahulu.");
          setUploading(false);
          return;
        }

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
                    const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                    setUploadProgress(pct);
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
      setUploading(false);
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

  // ─── Featured ─────────────────────────────────────────────────────
  async function toggleFeatured(videoId: string) {
    const next = featuredId === videoId ? null : videoId;
    await setFeaturedVideo(uid, next);
    setFeaturedId(next);
  }

  // ─── Moderate (admin) ─────────────────────────────────────────────
  async function handleApprove(videoId: string) {
    await moderateVideo(videoId, "approved");
    await loadData();
  }

  async function handleRejectConfirm() {
    if (!rejectTarget) return;
    await moderateVideo(rejectTarget, "rejected", rejectReason.trim() || "Tidak memenuhi aturan.");
    setRejectTarget(null);
    setRejectReason("");
    await loadData();
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <PageShell
      title="TreeGallery"
      description={`Maksimal ${MAX_VIDEOS} video, masing-masing ≤${MAX_DURATION_SEC} detik. Video tayang setelah disetujui Admin.`}
    >
      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-3xl border border-border/70 bg-gradient-to-br from-sky/15 to-cloud/40 p-4 shadow-soft">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-deep" />
        <div className="text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Aturan singkat</p>
          <p className="mt-0.5">
            Maks. {MAX_VIDEOS} video · durasi ≤ {MAX_DURATION_SEC} detik · tayang setelah moderasi
            Admin · pilih 1 video untuk Rumah Pohon.
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
                value={title}
                disabled={uploading}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Belajar Santai di Pohon"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* File upload */}
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
                        Ganti file
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

            {/* Link input */}
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
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Mendukung: YouTube, TikTok, Instagram Reels, atau URL video langsung lainnya.
                </p>
              </div>
            )}

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
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {approved.map((v) => {
              const yt = youtubeId(v.url);
              const isFeatured = featuredId === v.id;
              return (
                <div
                  key={v.id}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft"
                >
                  <button
                    onClick={() => setPreview(v)}
                    className="relative aspect-video w-full overflow-hidden bg-secondary"
                  >
                    <VideoThumbnail video={v} yt={yt} />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                      <Play className="size-10 text-white drop-shadow-lg opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    {isFeatured && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-leaf px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-soft">
                        <Star className="size-3 fill-current" /> Rumah Pohon
                      </span>
                    )}
                    <SourceBadge source={v.sourceType} />
                  </button>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-1 text-sm font-bold text-foreground">{v.title}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(v.submittedAt)}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => toggleFeatured(v.id)}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                          isFeatured
                            ? "bg-leaf/15 text-leaf"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                        }`}
                      >
                        {isFeatured ? "Tampil di Rumah Pohon" : "Jadikan Tayangan"}
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        aria-label="Hapus video"
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
                  <button
                    onClick={() => handleDelete(v.id)}
                    aria-label="Hapus video"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── PANEL ADMIN — SEMUA RIWAYAT & DUKUNGAN TAB ── */}
      {isAdmin && (
        <section className="mt-10 rounded-3xl border border-primary/20 bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
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
          </div>

          {/* Tab Filter Admin */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: "pending", label: "Menunggu Moderasi" },
              { key: "approved", label: "Disetujui" },
              { key: "rejected", label: "Ditolak" },
              { key: "all", label: "Semua Video" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAdminTab(tab.key as "all" | "pending" | "approved" | "rejected")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  adminTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Daftar Video Admin */}
          {adminVideos.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={CheckCircle2}
                title="Tidak ada video"
                description={`Tidak ada video dalam kategori "${adminTab}".`}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {adminVideos.map((v) => {
                const yt = youtubeId(v.url);
                const meta = STATUS_META[v.status];
                const StatusIcon = meta.icon;
                return (
                  <div
                    key={v.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-3.5 sm:flex-row sm:items-center"
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
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}
                        >
                          <StatusIcon className="size-3" />
                          {meta.label}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          UID: <code className="font-mono text-[10px]">{v.uid}</code>
                        </p>
                      </div>

                      <p className="line-clamp-1 text-sm font-bold text-foreground">{v.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Diunggah: {timeAgo(v.submittedAt)}
                      </p>
                      {v.reason && (
                        <p className="text-xs text-destructive">Alasan Penolakan: {v.reason}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {v.status !== "approved" && (
                        <button
                          onClick={() => handleApprove(v.id)}
                          className="flex items-center gap-1 rounded-lg bg-leaf/10 px-2.5 py-1.5 text-xs font-semibold text-leaf transition-colors hover:bg-leaf/20"
                        >
                          <Check className="size-3.5" /> Setujui
                        </button>
                      )}
                      {v.status !== "rejected" && (
                        <button
                          onClick={() => {
                            setRejectTarget(v.id);
                            setRejectReason("");
                          }}
                          className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                        >
                          <X className="size-3.5" /> Tolak
                        </button>
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

      {/* ── MODAL PREVIEW & REJECT ── */}
      {preview && <PreviewModal video={preview} onClose={() => setPreview(null)} />}

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
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
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
    </PageShell>
  );
}

// ── Helper Components ──────────────────────────────────────────────

function VideoThumbnail({ video, yt }: { video: GalleryVideo; yt: string | null }) {
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

    if (video.sourceType === "tiktok") {
      return (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-pink-500/10 to-cyan-500/10">
          <Film className="size-12 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">TikTok tidak mendukung embed langsung</p>
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <ExternalLink className="size-4" /> Buka di TikTok
          </a>
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-float"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <SourceBadge source={video.sourceType} small />
            <p className="line-clamp-1 text-sm font-bold text-foreground">{video.title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="ml-2 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        {renderPlayer()}
        <p className="px-4 py-3 text-xs text-muted-foreground">
          Diunggah {timeAgo(video.submittedAt)}
        </p>
      </div>
    </div>
  );
}
