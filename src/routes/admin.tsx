import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getAllGalleryVideosAdmin,
  moderateVideo,
  deleteGalleryVideoAdmin,
} from "@/lib/firestore-service";
import { ShieldCheck, Check, X, Clock, Video, ArrowLeft, LogOut, Trash2 } from "lucide-react";
import { youtubeId, timeAgo, type GalleryVideo } from "@/lib/social";

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
    await loadVideos();
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingId) return;
    await moderateVideo(
      rejectingId,
      "rejected",
      rejectReason || "Video tidak memenuhi pedoman komunitas.",
    );
    setRejectingId(null);
    setRejectReason("");
    await loadVideos();
  }

  async function handleDelete(videoId: string) {
    if (confirm("Apakah Anda yakin ingin menghapus video ini dari database?")) {
      await deleteGalleryVideoAdmin(videoId);
      await loadVideos();
    }
  }

  return (
    <main className="min-h-screen bg-background pb-20 pt-6 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header Admin */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-card p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Panel Moderasi Admin TreeGallery
              </h1>
              <p className="text-xs text-muted-foreground">
                Hanya akun ber-role Admin yang memiliki akses ke halaman ini.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center justify-center rounded-2xl border border-input bg-background px-4 py-2 text-xs font-bold text-foreground transition-all hover:bg-accent"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Kembali ke Home
            </button>
            <button
              onClick={async () => {
                await logout();
                navigate({ to: "/login" });
              }}
              className="inline-flex items-center justify-center rounded-2xl bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive transition-all hover:bg-destructive/20"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>

        {/* Tab Filter Status */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { key: "pending", label: "Menunggu Moderasi" },
            { key: "approved", label: "Disetujui" },
            { key: "rejected", label: "Ditolak" },
            { key: "all", label: "Semua Video" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() =>
                handleFilterChange(item.key as "all" | "pending" | "approved" | "rejected")
              }
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                filter === item.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-input bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* List Video */}
        <div className="mt-6 space-y-4">
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
              return (
                <div
                  key={video.id}
                  className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className="relative h-24 w-36 flex-shrink-0 overflow-hidden rounded-2xl bg-secondary">
                      {yId ? (
                        <img
                          src={`https://img.youtube.com/vi/${yId}/hqdefault.jpg`}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Video className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    {/* Informasi Detail Video */}
                    <div>
                      <h3 className="font-bold text-foreground text-base">{video.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Pengunggah (UID): <code className="font-mono text-[10px]">{video.uid}</code>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Diunggah: {timeAgo(video.submittedAt)}
                      </p>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-primary underline"
                      >
                        Buka Link Video ↗
                      </a>

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
                        className="inline-flex items-center justify-center rounded-2xl bg-gradient-leaf px-4 py-2 text-xs font-bold text-white shadow-soft transition-all hover:opacity-90"
                      >
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Approve
                      </button>
                    )}

                    {video.status !== "rejected" && (
                      <button
                        onClick={() => setRejectingId(video.id)}
                        className="inline-flex items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive transition-all hover:bg-destructive/20"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-card bg-card p-6 shadow-xl">
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
      </div>
    </main>
  );
}
