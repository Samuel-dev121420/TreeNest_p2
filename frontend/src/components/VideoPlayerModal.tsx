import { useEffect, useState } from "react";
import { X, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { youtubeId, tiktokId, timeAgo, type GalleryVideo, type GalleryVideoSource } from "@/lib/social";
import { resolveVideoUrl } from "@/lib/video-storage";

const SOURCE_LABEL: Record<GalleryVideoSource, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  upload: "File Upload",
  link: "Link",
};

/* Solid full-fill badges like TikTok badge style */
const SOURCE_COLOR: Record<GalleryVideoSource, string> = {
  youtube: "bg-red-600 text-white shadow-xs font-black",
  tiktok: "bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 shadow-xs font-black",
  upload: "bg-blue-600 text-white shadow-xs font-black",
  link: "bg-emerald-600 text-white shadow-xs font-black",
};

/* ─── Props ───────────────────────────────────────────────────────── */
export interface VideoPlayerModalProps {
  video: GalleryVideo;
  onClose: () => void;
  /** Admin mode: shows Approve / Reject buttons in footer */
  adminActions?: {
    onApprove: () => void;
    onReject: () => void;
  };
}

/* ─── Component ───────────────────────────────────────────────────── */
export function VideoPlayerModal({ video, onClose, adminActions }: VideoPlayerModalProps) {
  const yt = youtubeId(video.url);
  const isTikTok = video.sourceType === "tiktok";
  const ttId = isTikTok ? tiktokId(video.url) : null;

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

  /* ─── Player Area ──────────────────────────────────────────────── */
  function renderPlayer() {
    /* YouTube */
    if (yt) {
      return (
        <div className="aspect-video w-full max-h-[60vh] bg-neutral-950">
          <iframe
            className="size-full border-0"
            src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    /* TikTok — Dynamic 9:16 Vertical Player Container (No Cropping) */
    if (isTikTok) {
      if (!ttId) {
        return (
          <div className="flex aspect-[9/16] w-full max-h-[70vh] items-center justify-center bg-neutral-950 p-6">
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <ExternalLink className="size-4" /> Buka di TikTok
            </a>
          </div>
        );
      }

      const playerSrc = `https://www.tiktok.com/player/v1/${ttId}?music_info=0&description=0&controls=1&rel=0&native_context_menu=0&closed_caption=0`;

      return (
        <div className="relative flex aspect-[9/16] w-full max-h-[70vh] items-center justify-center overflow-hidden bg-neutral-950">
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

    /* Upload / Direct link — Landscape 16:9 Canvas */
    if (video.sourceType === "upload" || video.sourceType === "link") {
      return (
        <div className="relative flex aspect-video w-full max-h-[60vh] items-center justify-center bg-neutral-950">
          <video
            className="size-full max-h-[60vh] object-contain"
            src={resolvedUrl || video.url}
            controls
            autoPlay
            playsInline
          />
        </div>
      );
    }

    /* Generic fallback */
    return (
      <div className="flex aspect-video w-full max-h-[60vh] flex-col items-center justify-center gap-4 bg-neutral-950 p-6">
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          <ExternalLink className="size-4" /> Buka Tautan Video
        </a>
      </div>
    );
  }

  /* ─── Modal Shell (Dynamic size: 9:16 for TikTok, 16:9 for YouTube/Upload/Link) ─── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 ${
          isTikTok
            ? "max-w-[360px] sm:max-w-[390px]"
            : "max-w-xl sm:max-w-2xl"
        }`}
      >
        {/* ── Header: Clean Grouped Badge & Title + Perfect Optical Badge Centering ── */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 sm:py-3.5 dark:border-neutral-800">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              className={`inline-flex h-6 sm:h-6.5 shrink-0 items-center justify-center rounded-md px-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider leading-none ${SOURCE_COLOR[video.sourceType]}`}
            >
              {SOURCE_LABEL[video.sourceType]}
            </span>
            <h3 className="min-w-0 flex-1 truncate text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-snug my-auto">
              {video.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="shrink-0 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ── Video Canvas (Dynamic aspect ratio per format) ── */}
        {renderPlayer()}

        {/* ── Footer: High-contrast clear text ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-0.5">
            {adminActions && (
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                UID:{" "}
                <span className="font-bold text-neutral-900 dark:text-white">
                  {video.uid}
                </span>
              </span>
            )}
            <span className="text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Masuk {timeAgo(video.approvedAt || video.submittedAt)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* External link for TikTok / link */}
            {(isTikTok || video.sourceType === "link") && (
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-800 transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                <ExternalLink className="size-3.5" />
                {isTikTok ? "Buka di TikTok" : "Buka Tautan"}
              </a>
            )}

            {/* Admin: Approve */}
            {adminActions && video.status !== "approved" && (
              <button
                type="button"
                onClick={adminActions.onApprove}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 cursor-pointer"
              >
                <CheckCircle className="size-3.5" /> Approve
              </button>
            )}

            {/* Admin: Reject */}
            {adminActions && video.status !== "rejected" && (
              <button
                type="button"
                onClick={adminActions.onReject}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/50 cursor-pointer"
              >
                <XCircle className="size-3.5" /> Reject
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
