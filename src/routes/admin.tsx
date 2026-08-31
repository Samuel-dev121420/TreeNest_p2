import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  type UserProfile,
} from "@/lib/firestore-service";
import { ShieldCheck, Check, X, Clock, Video, ArrowLeft, LogOut, Trash2, Play, Film, ExternalLink, AlertTriangle } from "lucide-react";
import { youtubeId, tiktokId, fetchTikTokThumbnail, timeAgo, type GalleryVideo } from "@/lib/social";
import { resolveVideoUrl } from "@/lib/video-storage";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): { from?: string | undefined } => ({
    from: typeof search["from"] === "string" ? search["from"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Panel Admin — Moderasi TreeGallery" },
      {
        name: "description",
        content: "Panel khusus Admin untuk menyetujui atau menolak video TreeGallery.",
      },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { from: searchFrom } = Route.useSearch();
  const returnPath =
    searchFrom ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("treenest_admin_return_path")
      : null) ||
    "/";

  const { profile, logout } = useAuth();
  const [videos, setVideos] = useState<GalleryVideo[]>([]);
  const [uploaderProfiles, setUploaderProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "history">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [previewVideo, setPreviewVideo] = useState<GalleryVideo | null>(null);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);

  useScrollLock(Boolean(rejectingId || approvingId || previewVideo || showClearHistoryModal));

  useEffect(() => {
    loadVideos(filter);
  }, []);

  useEffect(() => {
    if (profile?.themePreference === "dark") {
      document.documentElement.classList.add("dark");
    } else if (profile?.themePreference === "light") {
      document.documentElement.classList.remove("dark");
    }
  }, [profile?.themePreference]);

  function handleBack() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("treenest_admin_return_path");
    }
    navigate({ to: returnPath });
  }

  async function loadVideos(currentFilter = filter) {
    setLoading(true);
    const data = await getAllGalleryVideosAdmin(currentFilter);
    setVideos(data);
    setLoading(false);

    // Fetch user profiles for all video uploaders
    const uniqueUids = Array.from(new Set(data.map((v) => v.uid).filter(Boolean)));
    const profiles = await Promise.all(uniqueUids.map((u) => getUserProfile(u)));
    const map: Record<string, UserProfile> = {};
    profiles.forEach((p) => {
      if (p?.uid) map[p.uid] = p;
    });
    setUploaderProfiles(map);
  }

  function handleFilterChange(newFilter: "pending" | "history") {
    setFilter(newFilter);
    loadVideos(newFilter);
  }

  async function handleApproveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!approvingId) return;
    const target = videos.find((v) => v.id === approvingId);
    await moderateVideo(approvingId, "approved", approvalComment.trim(), target?.uid, target?.title);
    setApprovingId(null);
    setApprovalComment("");
    loadVideos();
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingId) return;
    const target = videos.find((v) => v.id === rejectingId);
    await moderateVideo(rejectingId, "rejected", rejectReason, target?.uid, target?.title);
    setRejectingId(null);
    setRejectReason("");
    loadVideos();
  }

  async function handleDelete(videoId: string) {
    if (!confirm("Hapus video ini secara permanen dari server?")) return;
    await deleteGalleryVideoAdmin(videoId);
    loadVideos();
  }

  async function handleClearAllHistory() {
    await clearAllVideoHistoryAdmin();
    setShowClearHistoryModal(false);
    loadVideos("history");
  }

  return (
    <main className="min-h-screen bg-gradient-soft text-foreground pb-20 select-none">
      {/* Header Admin */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 dark:border-border/60 dark:bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-soft transition-all hover:bg-secondary hover:border-primary/50 hover:text-primary active:scale-95 cursor-pointer dark:border-border/70 dark:bg-secondary/40 dark:text-foreground dark:hover:bg-secondary/90 dark:hover:border-primary/50 dark:hover:text-primary"
              title={returnPath !== "/" ? "Kembali ke Halaman Sebelumnya" : "Kembali ke Beranda"}
            >
              <ArrowLeft className="size-4" />
              <span>Kembali</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-none text-foreground">Moderasi TreeGallery</h1>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Admin: {profile?.username} ({profile?.accountId})
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            className="flex items-center gap-1.5 rounded-2xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-bold text-destructive shadow-soft transition-all hover:bg-destructive hover:text-white hover:border-destructive active:scale-95 cursor-pointer dark:border-destructive/40 dark:bg-destructive/20 dark:text-red-300 dark:hover:bg-destructive dark:hover:text-white dark:hover:border-destructive"
          >
            <LogOut className="size-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Konten Utama */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Filter Tab & Action Buttons */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto rounded-3xl border-2 border-border/80 bg-card dark:border-border/60 dark:bg-secondary/40 p-1.5 shadow-soft">
            {[
              { key: "pending", label: "Menunggu Moderasi" },
              { key: "history", label: "Riwayat Video" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => handleFilterChange(t.key as "pending" | "history")}
                className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  filter === t.key
                    ? "bg-primary text-primary-foreground shadow-soft scale-[1.02]"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {filter === "history" && videos.length > 0 && (
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

        {/* Daftar Video dengan Motion Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-4"
          >
            {loading ? (
              <div className="rounded-3xl border-2 border-border/80 bg-card/60 dark:border-border/60 p-8 text-center text-sm font-medium text-muted-foreground">
                Memuat daftar video moderasi...
              </div>
            ) : videos.length === 0 ? (
              <div className="rounded-3xl border-2 border-border/80 bg-card/60 dark:border-border/60 p-8 text-center text-sm font-medium text-muted-foreground">
                Tidak ada video dalam kategori ini.
              </div>
            ) : (
              videos.map((video) => {
                const yId = youtubeId(video.url);
                const isUpload = video.sourceType === "upload" || video.url.startsWith("indexeddb:") || video.url.startsWith("blob:");
                const uploader = uploaderProfiles[video.uid];
                return (
                  <div
                    key={video.id}
                    className="flex flex-col gap-4 rounded-3xl border-2 border-border/80 bg-card p-5 shadow-soft dark:border-border/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      {/* Thumbnail yang bisa diklik untuk preview langsung */}
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

                      {/* Informasi Detail Video */}
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
                          Diunggah: {timeAgo(video.submittedAt)} · Tipe: <span className="font-semibold uppercase">{video.sourceType}</span>
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewVideo(video)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 px-3 py-1.5 text-xs font-bold text-primary transition-colors"
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

                        {/* Catatan jika disetujui */}
                        {video.status === "approved" && video.approvalComment && (
                          <p className="mt-2 rounded-xl bg-leaf/10 p-2 text-xs font-medium text-leaf">
                            Catatan Persetujuan: {video.approvalComment}
                          </p>
                        )}

                        {/* Reason jika ditolak */}
                        {video.status === "rejected" && video.reason && (
                          <p className="mt-2 rounded-xl bg-destructive/10 p-2 text-xs font-medium text-destructive">
                            Alasan Penolakan: {video.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tombol Aksi Moderasi - HANYA untuk status pending */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {video.status === "pending" && (
                        <>
                          <button
                            onClick={() => {
                              setApprovingId(video.id);
                              setApprovalComment("");
                            }}
                            className="inline-flex items-center justify-center rounded-2xl bg-gradient-leaf px-4 py-2 text-xs font-bold text-white shadow-soft transition-all hover:opacity-90 active:scale-95"
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Setujui
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(video.id);
                              setRejectReason("");
                            }}
                            className="inline-flex items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive transition-all hover:bg-destructive/20 active:scale-95"
                          >
                            <X className="mr-1.5 h-3.5 w-3.5" />
                            Tolak
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(video.id)}
                        title="Hapus Video"
                        className="inline-flex items-center justify-center rounded-2xl border border-border p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>

        {/* Modal Dialog Approve (Opsional Comment) */}
        {approvingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-xl">
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
                  className="w-full rounded-2xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground p-3 text-xs focus:border-primary focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setApprovingId(null);
                      setApprovalComment("");
                    }}
                    className="rounded-2xl border border-input px-4 py-2 text-xs font-bold text-foreground hover:bg-accent"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    Konfirmasi Setujui
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Dialog Reject */}
        {rejectingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-xl">
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
                  className="w-full rounded-2xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground p-3 text-xs focus:border-destructive focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(null);
                      setRejectReason("");
                    }}
                    className="rounded-2xl border border-input px-4 py-2 text-xs font-bold text-foreground hover:bg-accent"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90"
                  >
                    Konfirmasi Reject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Player Moderasi Video */}
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

        {/* Modal Konfirmasi Hapus Semua Riwayat Video */}
        {showClearHistoryModal && (
          <div
            onClick={() => setShowClearHistoryModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Hapus Semua Riwayat Video?</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong>SELURUH riwayat video</strong> (disetujui & ditolak) secara permanen dari server? Tindakan ini tidak dapat dibatalkan.
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
      </div>
    </main>
  );
}

// AdminPreviewModal has been replaced by the shared VideoPlayerModal component.
// See: src/components/VideoPlayerModal.tsx (adminActions prop).


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
