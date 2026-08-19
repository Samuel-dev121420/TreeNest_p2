import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getAllGalleryVideosAdmin,
  moderateVideo,
  deleteGalleryVideoAdmin,
} from "@/lib/firestore-service";
import { ShieldCheck, Check, X, Clock, Video, ArrowLeft, LogOut, Trash2, Play, Film, ExternalLink } from "lucide-react";
import { youtubeId, timeAgo, type GalleryVideo } from "@/lib/social";
import { resolveVideoUrl } from "@/lib/video-storage";

export const Route = createFileRoute("/admin")({
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
  const { profile, logout } = useAuth();
  const [videos, setVideos] = useState<GalleryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewVideo, setPreviewVideo] = useState<GalleryVideo | null>(null);

  useEffect(() => {
    loadVideos(filter);
  }, []);

  async function loadVideos(currentFilter = filter) {
    setLoading(true);
    const data = await getAllGalleryVideosAdmin(currentFilter);
    setVideos(data);
    setLoading(false);
  }

  function handleFilterChange(newFilter: "all" | "pending" | "approved" | "rejected") {
    setFilter(newFilter);
    loadVideos(newFilter);
  }

  async function handleApprove(videoId: string) {
    await moderateVideo(videoId, "approved");
    loadVideos();
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingId) return;
    await moderateVideo(rejectingId, "rejected", rejectReason);
    setRejectingId(null);
    setRejectReason("");
    loadVideos();
  }

  async function handleDelete(videoId: string) {
    if (!confirm("Hapus video ini secara permanen dari server?")) return;
    await deleteGalleryVideoAdmin(videoId);
    loadVideos();
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      {/* Header Admin */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/" })}
              className="rounded-2xl border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-none">Moderasi TreeGallery</h1>
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
            className="flex items-center gap-1.5 rounded-2xl border border-input bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </header>

      {/* Konten Utama */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Filter Tab */}
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-3xl border border-border/60 bg-card p-1.5 shadow-soft">
          {(["pending", "approved", "rejected", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleFilterChange(t)}
              className={`rounded-2xl px-4 py-2 text-xs font-bold capitalize transition-all ${
                filter === t
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "pending" && "Menunggu Review"}
              {t === "approved" && "Disetujui"}
              {t === "rejected" && "Ditolak"}
              {t === "all" && "Semua Video"}
            </button>
          ))}
        </div>

        {/* Daftar Video */}
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-card bg-card/60 p-8 text-center text-sm font-medium text-muted-foreground">
              Memuat daftar video moderasi...
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-3xl border border-card bg-card/60 p-8 text-center text-sm font-medium text-muted-foreground">
              Tidak ada video dalam kategori ini.
            </div>
          ) : (
            videos.map((video) => {
              const yId = youtubeId(video.url);
              const isUpload = video.sourceType === "upload" || video.url.startsWith("indexeddb:") || video.url.startsWith("blob:");
              return (
                <div
                  key={video.id}
                  className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail yang bisa diklik untuk preview langsung */}
                    <div
                      onClick={() => setPreviewVideo(video)}
                      className="group relative h-24 w-36 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-secondary shadow-inner"
                      title="Klik untuk memutar video"
                    >
                      {yId ? (
                        <img
                          src={`https://img.youtube.com/vi/${yId}/hqdefault.jpg`}
                          alt={video.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-leaf/15 to-primary/10 text-muted-foreground">
                          <Film className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex size-9 items-center justify-center rounded-full bg-white/90 text-neutral-950 shadow-md">
                          <Play className="size-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Informasi Detail Video */}
                    <div>
                      <h3 className="font-bold text-foreground text-base">{video.title}</h3>
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

                      {/* Reason jika ditolak */}
                      {video.status === "rejected" && video.reason && (
                        <p className="mt-2 rounded-xl bg-destructive/10 p-2 text-xs text-destructive">
                          Alasan Penolakan: {video.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi Moderasi */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {video.status !== "approved" && (
                      <button
                        onClick={() => handleApprove(video.id)}
                        className="inline-flex items-center justify-center rounded-2xl bg-gradient-leaf px-4 py-2 text-xs font-bold text-white shadow-soft transition-all hover:opacity-90 active:scale-95"
                      >
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Approve
                      </button>
                    )}

                    {video.status !== "rejected" && (
                      <button
                        onClick={() => setRejectingId(video.id)}
                        className="inline-flex items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive transition-all hover:bg-destructive/20 active:scale-95"
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Reject
                      </button>
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
        </div>

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
                  className="w-full rounded-2xl border border-input bg-background p-3 text-xs text-foreground focus:border-destructive focus:outline-none"
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
          <AdminPreviewModal
            video={previewVideo}
            onClose={() => setPreviewVideo(null)}
            onApprove={async () => {
              await handleApprove(previewVideo.id);
              setPreviewVideo(null);
            }}
            onReject={() => {
              setRejectingId(previewVideo.id);
              setPreviewVideo(null);
            }}
          />
        )}
      </div>
    </main>
  );
}

function AdminPreviewModal({
  video,
  onClose,
  onApprove,
  onReject,
}: {
  video: GalleryVideo;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const yt = youtubeId(video.url);
  const [resolvedUrl, setResolvedUrl] = useState<string>(video.url);

  useEffect(() => {
    let active = true;
    resolveVideoUrl(video.url, video.id).then((u) => {
      if (active && u) setResolvedUrl(u);
    });
    return () => {
      active = false;
    };
  }, [video.url, video.id]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-float animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5 bg-card">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Moderasi: {video.sourceType}
            </span>
            <p className="line-clamp-1 text-sm font-bold text-foreground">{video.title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="aspect-video w-full bg-black">
          {yt ? (
            <iframe
              className="size-full"
              src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : video.sourceType === "tiktok" ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-pink-500/10 to-cyan-500/10">
              <Film className="size-12 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Video Tautan TikTok</p>
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <ExternalLink className="size-4" /> Buka di TikTok
              </a>
            </div>
          ) : (
            <video
              className="size-full object-contain"
              src={resolvedUrl || video.url}
              controls
              autoPlay
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 bg-card px-5 py-3.5">
          <p className="text-xs text-muted-foreground">UID: {video.uid}</p>
          <div className="flex items-center gap-2">
            {video.status !== "approved" && (
              <button
                type="button"
                onClick={onApprove}
                className="rounded-xl bg-leaf px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                Approve Video
              </button>
            )}
            {video.status !== "rejected" && (
              <button
                type="button"
                onClick={onReject}
                className="rounded-xl bg-destructive/15 text-destructive px-4 py-2 text-xs font-bold hover:bg-destructive/25 transition-colors"
              >
                Reject Video
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
