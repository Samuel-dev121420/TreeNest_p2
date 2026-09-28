import { useEffect, useRef, useState } from "react";
import {
  X,
  ExternalLink,
  CheckCircle,
  XCircle,
  Link2,
  Check,
  Settings,
  Volume2,
  Volume1,
  VolumeX,
  Film,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { youtubeId, tiktokId, timeAgo, type GalleryVideo } from "@/lib/social";
import { resolveVideoUrl } from "@/lib/video-storage";

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
  const isYTShort = Boolean(yt && (video.url.includes("/shorts/") || video.url.includes("shorts/")));

  const [resolvedUrl, setResolvedUrl] = useState<string>(video.url);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);
  const tiktokIframeRef = useRef<HTMLIFrameElement>(null);

  // Playback state: starts paused as requested
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [tikTokAutoplay, setTikTokAutoplay] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Dynamic aspect ratio category for uploaded / direct-link videos (Default portrait 9:16)
  const [detectedRatio, setDetectedRatio] = useState<"portrait" | "square" | "standard" | "widescreen">("portrait");

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = e.currentTarget;
    if (videoWidth && videoHeight) {
      const r = videoWidth / videoHeight;
      if (r < 0.75) {
        setDetectedRatio("portrait");
      } else if (r <= 1.15) {
        setDetectedRatio("square");
      } else if (r <= 1.5) {
        setDetectedRatio("standard");
      } else {
        setDetectedRatio("widescreen");
      }
    }
  };

  // Side Controls States
  const [copied, setCopied] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState(false);
  const [loopSpin, setLoopSpin] = useState(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  function handleToggleLoop() {
    setIsLooping((prev) => !prev);
    setLoopSpin((prev) => prev + 360);
  }

  // Full Screen toggle handler
  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        const target = playerContainerRef.current;
        if (target?.requestFullscreen) {
          await target.requestFullscreen();
        } else if ((target as any)?.webkitRequestFullscreen) {
          await (target as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any)?.webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.error("Fullscreen toggle error:", err);
    }
  };

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Play/Pause toggle function for all video types
  const togglePlay = () => {
    // 1. YouTube iframe
    if (yt && ytIframeRef.current?.contentWindow) {
      const target = ytIframeRef.current.contentWindow;
      if (isPlaying) {
        target.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: "" }), "*");
        target.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
        setIsPlaying(false);
      } else {
        target.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: "" }), "*");
        target.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
        setIsPlaying(true);
      }
      return;
    }

    // 2. TikTok iframe
    if (isTikTok) {
      if (isPlaying || tikTokAutoplay) {
        setTikTokAutoplay(false);
        setIsPlaying(false);
        if (tiktokIframeRef.current?.contentWindow) {
          const target = tiktokIframeRef.current.contentWindow;
          target.postMessage({ type: "pause" }, "*");
          target.postMessage({ type: "player:pause" }, "*");
          target.postMessage(JSON.stringify({ type: "pause" }), "*");
          target.postMessage(JSON.stringify({ type: "player:pause" }), "*");
        }
      } else {
        setTikTokAutoplay(true);
        setIsPlaying(true);
        if (tiktokIframeRef.current?.contentWindow) {
          const target = tiktokIframeRef.current.contentWindow;
          target.postMessage({ type: "play" }, "*");
          target.postMessage({ type: "player:play" }, "*");
          target.postMessage(JSON.stringify({ type: "play" }), "*");
          target.postMessage(JSON.stringify({ type: "player:play" }), "*");
        }
      }
      return;
    }

    // 3. Native HTML5 video (Upload / Link)
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }
  };

  const handleClose = () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  // Blur on unmount to prevent focus ring on previous card
  useEffect(() => {
    if (isTikTok) {
      const timer = setTimeout(() => {
        try {
          tiktokIframeRef.current?.focus();
        } catch {}
      }, 250);
      return () => clearTimeout(timer);
    }
    return () => {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
  }, [isTikTok]);

  // Global keyboard shortcuts (Space to toggle play/pause, Escape to close, F for fullscreen)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input or contenteditable element
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          e.preventDefault();
          handleClose();
        }
        return;
      }

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        togglePlay();
        return;
      }

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullScreen();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, yt, isTikTok, resolvedUrl, video.url]);

  useEffect(() => {
    let active = true;
    resolveVideoUrl(video.url, video.id).then((u) => {
      if (active && u) {
        setResolvedUrl(u);
        const tempVid = document.createElement("video");
        tempVid.src = u;
        tempVid.onloadedmetadata = () => {
          if (!active) return;
          const { videoWidth, videoHeight } = tempVid;
          if (videoWidth && videoHeight) {
            const r = videoWidth / videoHeight;
            if (r < 0.75) setDetectedRatio("portrait");
            else if (r <= 1.15) setDetectedRatio("square");
            else if (r <= 1.5) setDetectedRatio("standard");
            else setDetectedRatio("widescreen");
          }
        };
      }
    });
    return () => {
      active = false;
    };
  }, [video.url, video.id]);

  // Sync controls with native HTML video if applicable
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.loop = isLooping;
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }

    // Sync YouTube iframe via postMessage API
    if (ytIframeRef.current && yt) {
      const target = ytIframeRef.current.contentWindow;
      if (target) {
        target.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [volume * 100] }), '*');
        target.postMessage(JSON.stringify({ event: 'command', func: isMuted ? 'mute' : 'unMute', args: [] }), '*');
        target.postMessage(JSON.stringify({ event: 'command', func: 'setLoop', args: [isLooping] }), '*');
      }
    }
  }, [playbackSpeed, isLooping, volume, isMuted, yt]);

  const handleIframeLoad = () => {
    if (ytIframeRef.current?.contentWindow) {
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "listening", id: 1 }),
        "*"
      );
    }
  };

  // Handle YouTube auto-reset, auto-loop, and playback state tracking
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (typeof event.data !== "string") return;
      try {
        const data = JSON.parse(event.data);
        const isEnded =
          (data.event === "onStateChange" && data.info === 0) ||
          (data.event === "infoDelivery" && data.info && data.info.playerState === 0);

        if (isEnded) {
          setIsPlaying(false);
          if (isLooping && ytIframeRef.current?.contentWindow) {
            const target = ytIframeRef.current.contentWindow;
            target.postMessage(
              JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }),
              "*"
            );
            target.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: "" }),
              "*"
            );
            setIsPlaying(true);
          }
        } else if (data.event === "onStateChange" || (data.event === "infoDelivery" && typeof data.info?.playerState === "number")) {
          const state = typeof data.info === "number" ? data.info : data.info?.playerState;
          if (state === 1) setIsPlaying(true); // Playing
          else if (state === 2 || state === 0 || state === 5) setIsPlaying(false); // Paused / Ended / Cued
        }
      } catch {
        // ignore non-json messages
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isLooping]);

  function handleCopyLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(video.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleToggleMute() {
    setIsMuted((prev) => !prev);
  }

  /* ─── Player Area ──────────────────────────────────────────────── */
  function renderPlayer() {
    /* YouTube */
    if (yt) {
      const ytOrigin = typeof window !== "undefined" ? window.location.origin : "";
      return (
        <div className={`w-full bg-neutral-950 overflow-hidden flex items-center justify-center ${
          isFullscreen
            ? "size-full max-h-screen"
            : isYTShort
              ? "aspect-[9/16] max-h-[70vh] sm:max-h-[72vh]"
              : "aspect-video max-h-[76vh]"
        }`}>
          <iframe
            ref={ytIframeRef}
            className={`border-0 ${
              isFullscreen
                ? isYTShort
                  ? "h-full aspect-[9/16] max-w-full"
                  : "size-full aspect-video max-w-full"
                : "size-full"
            }`}
            src={`https://www.youtube.com/embed/${yt}?autoplay=0&enablejsapi=1&origin=${encodeURIComponent(ytOrigin)}&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`}
            title={video.title}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            onLoad={handleIframeLoad}
          />
        </div>
      );
    }

    /* TikTok — Clean 9:16 Vertical Player Container without like/comment/share overlay */
    if (isTikTok) {
      if (!ttId) {
        return (
          <div className={`flex w-full items-center justify-center bg-neutral-950 p-6 ${
            isFullscreen ? "size-full" : "aspect-[9/16] max-h-[70vh]"
          }`}>
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <ExternalLink className="size-4" /> Buka di TikTok
            </a>
          </div>
        );
      }

      // Parameters to strip like, comment, share, and description bars, plus dynamic autoplay param
      const playerSrc = `https://www.tiktok.com/player/v1/${ttId}?music_info=0&description=0&controls=1&rel=0&native_context_menu=0&closed_caption=0&autoplay=${tikTokAutoplay ? 1 : 0}`;

      const handleTikTokIframeLoad = () => {
        try {
          tiktokIframeRef.current?.focus();
        } catch {}
      };

      return (
        <div className={`relative flex w-full items-center justify-center overflow-hidden bg-neutral-950 ${
          isFullscreen ? "size-full max-h-screen" : "aspect-[9/16] max-h-[70vh]"
        }`}>
          <iframe
            ref={tiktokIframeRef}
            className={`border-0 focus:outline-none ${isFullscreen ? "h-full aspect-[9/16] max-w-full" : "size-full"}`}
            src={playerSrc}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            onLoad={handleTikTokIframeLoad}
          />
        </div>
      );
    }

    /* Upload / Direct link — Dynamic Canvas per detected ratio */
    if (video.sourceType === "upload" || video.sourceType === "link") {
      let aspectClass = isFullscreen
        ? "size-full max-h-screen"
        : "aspect-[9/16] max-h-[70vh] sm:max-h-[72vh]";

      if (!isFullscreen) {
        if (detectedRatio === "square") {
          aspectClass = "aspect-square max-h-[65vh]";
        } else if (detectedRatio === "standard") {
          aspectClass = "aspect-[4/3] max-h-[70vh]";
        } else if (detectedRatio === "widescreen") {
          aspectClass = "aspect-video max-h-[76vh]";
        }
      }

      return (
        <div className={`relative flex ${aspectClass} w-full items-center justify-center bg-neutral-950 overflow-hidden`}>
          <video
            ref={videoRef}
            className="size-full object-contain"
            src={resolvedUrl || video.url}
            controls
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={handleVideoMetadata}
          />
        </div>
      );
    }

    /* Generic fallback */
    return (
      <div className={`flex w-full flex-col items-center justify-center gap-4 bg-neutral-950 p-6 ${
        isFullscreen ? "size-full" : "aspect-video max-h-[60vh]"
      }`}>
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          <ExternalLink className="size-4" /> Buka Tautan Video
        </a>
      </div>
    );
  }

  // Platform metadata for top icon in the attached dock
  const platformMeta = yt
    ? {
        name: "YouTube",
        icon: (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <path
              d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
              fill="#FF0000"
            />
            <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFFFFF" />
          </svg>
        ),
        href: video.url,
      }
    : isTikTok
      ? {
          name: "TikTok",
          icon: (
            <svg className="size-4 shrink-0 text-neutral-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.34 6.34 0 0 0 1.86-4.49V8.58a8.28 8.28 0 0 0 4.88 1.57V6.69z" />
            </svg>
          ),
          href: video.url,
        }
      : video.sourceType === "upload"
        ? {
            name: "Video File",
            icon: <Film className="size-4 shrink-0 text-blue-500" />,
            href: null,
          }
        : {
            name: "Tautan Web",
            icon: <Link2 className="size-4 shrink-0 text-emerald-500" />,
            href: video.url,
          };

  // Determine modal width based on platform & aspect ratio
  let modalWidthClass = "w-[340px] sm:w-[380px]";

  if (isTikTok || isYTShort) {
    modalWidthClass = "w-[340px] sm:w-[380px]";
  } else if (yt) {
    modalWidthClass = "w-[92vw] max-w-[calc(100vw-110px)] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl";
  } else if (video.sourceType === "upload" || video.sourceType === "link") {
    if (detectedRatio === "portrait") {
      modalWidthClass = "w-[340px] sm:w-[380px]";
    } else if (detectedRatio === "square") {
      modalWidthClass = "w-[90vw] max-w-[440px] sm:max-w-[500px]";
    } else if (detectedRatio === "standard") {
      modalWidthClass = "w-[90vw] max-w-[580px] sm:max-w-[680px]";
    } else {
      modalWidthClass = "w-[92vw] max-w-[calc(100vw-110px)] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl";
    }
  } else {
    modalWidthClass = "w-[90vw] max-w-lg";
  }

  /* ─── Modal Shell ───────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md"
    >
      <div className="relative flex items-center justify-center max-w-full">
        {/* ── Main Modal Container ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 transition-[width,max-width] duration-300 ${modalWidthClass}`}
        >
          {/* ── Header: Judul di Kiri, Tombol Close di Kanan ── */}
          <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 sm:py-3.5 dark:border-neutral-800">
            <h3 className="min-w-0 flex-1 truncate text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
              {video.title}
            </h3>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Tutup"
              className="shrink-0 rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* ── Video Canvas ── */}
          <div
            ref={playerContainerRef}
            className={`relative w-full overflow-hidden bg-neutral-950 flex items-center justify-center ${
              isFullscreen ? "fixed inset-0 z-[100] size-full h-screen max-h-none" : ""
            }`}
          >
            {renderPlayer()}

            {/* Floating Exit Fullscreen Button in Fullscreen mode */}
            {isFullscreen && (
              <button
                type="button"
                onClick={toggleFullScreen}
                title="Keluar Layar Penuh"
                aria-label="Keluar Layar Penuh"
                className="absolute top-4 right-4 z-50 flex items-center gap-2 rounded bg-black/75 px-3.5 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-black/90 cursor-pointer border border-white/20 hover:scale-105 active:scale-95"
              >
                <Minimize2 className="size-4" />
                <span>Keluar Layar Penuh</span>
              </button>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-0.5">
              {adminActions && (
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  UID:{" "}
                  <span className="font-bold text-neutral-900 dark:text-white">{video.uid}</span>
                </span>
              )}
              <span className="text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Masuk {timeAgo(video.approvedAt || video.submittedAt)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* External link */}
              {(yt || isTikTok || video.sourceType === "link" || video.sourceType === "youtube") && (
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-800 transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  {yt || video.sourceType === "youtube"
                    ? "Buka di YouTube"
                    : isTikTok
                      ? "Buka di TikTok"
                      : "Buka Tautan"}
                </a>
              )}

              {/* Admin Actions */}
              {adminActions && video.status !== "approved" && (
                <button
                  type="button"
                  onClick={adminActions.onApprove}
                  className="flex items-center gap-1.5 rounded bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 cursor-pointer"
                >
                  <CheckCircle className="size-3.5" /> Approve
                </button>
              )}

              {adminActions && video.status !== "rejected" && (
                <button
                  type="button"
                  onClick={adminActions.onReject}
                  className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/50 cursor-pointer"
                >
                  <XCircle className="size-3.5" /> Reject
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── TreeNest Integrated Side Dock (Menempel Langsung di Samping Kanan Tengah Tanpa Jarak) ── */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-full top-1/2 -translate-y-1/2 z-40 flex w-[48px] flex-col items-start gap-1.5 border-y border-r border-neutral-200/90 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95"
        >
          {/* 1. Platform Icon (YouTube / TikTok / Upload / Link) dengan Hover Expand */}
          {platformMeta.href ? (
            <a
              href={platformMeta.href}
              target="_blank"
              rel="noreferrer"
              title={`Buka di ${platformMeta.name}`}
              className="group flex h-9 w-max max-w-[36px] hover:max-w-[160px] items-center overflow-hidden bg-neutral-100/80 px-2 text-neutral-800 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-200 dark:bg-neutral-800/80 dark:text-neutral-100 dark:hover:bg-neutral-700 cursor-pointer shadow-xs"
            >
              {platformMeta.icon}
              <span className="ml-2 whitespace-nowrap text-xs font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {platformMeta.name}
              </span>
            </a>
          ) : (
            <div
              title={platformMeta.name}
              className="group flex h-9 w-max max-w-[36px] hover:max-w-[160px] items-center overflow-hidden bg-neutral-100/80 px-2 text-neutral-800 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-200 dark:bg-neutral-800/80 dark:text-neutral-100 dark:hover:bg-neutral-700 shadow-xs"
            >
              {platformMeta.icon}
              <span className="ml-2 whitespace-nowrap text-xs font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {platformMeta.name}
              </span>
            </div>
          )}

          {/* 2. Tombol Layar Penuh (Full Screen) dengan Hover Expand — Tepat di bawah informasi tipe video */}
          <button
            type="button"
            onClick={toggleFullScreen}
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            aria-label={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            className={`group flex h-9 w-max max-w-[36px] hover:max-w-[160px] items-center overflow-hidden px-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-xs ${
              isFullscreen
                ? "bg-primary text-primary-foreground"
                : "bg-neutral-100/80 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:text-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            {isFullscreen ? (
              <Minimize2 className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
            ) : (
              <Maximize2 className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
            )}
            <span className="ml-2 whitespace-nowrap text-xs font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            </span>
          </button>

          {/* 2. Salin Link (Icon Peniti Berbaring / Link2) dengan Hover Expand — Khusus non-upload */}
          {video.sourceType !== "upload" && (
            <button
              type="button"
              onClick={handleCopyLink}
              title={copied ? "Tautan Disalin!" : "Salin Link"}
              className={`group flex h-9 w-max max-w-[36px] hover:max-w-[160px] items-center overflow-hidden px-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-xs ${
                copied
                  ? "bg-emerald-500 text-white max-w-[160px]"
                  : "bg-neutral-100/80 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:text-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {copied ? <Check className="size-4 shrink-0 animate-in zoom-in" /> : <Link2 className="size-4 shrink-0 rotate-45" />}
              <span
                className={`ml-2 whitespace-nowrap text-xs font-bold transition-opacity duration-200 ${
                  copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {copied ? "Tersalin!" : "Salin Link"}
              </span>
            </button>
          )}

          {/* 3. Loop Toggle (Replacing Settings) */}
          {!isTikTok && (
            <button
              type="button"
              onClick={handleToggleLoop}
              title={isLooping ? "Loop Aktif (Klik untuk matikan)" : "Loop Nonaktif (Klik untuk aktifkan)"}
              className={`group flex h-9 w-max max-w-[36px] hover:max-w-[160px] items-center overflow-hidden px-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-xs ${
                isLooping
                  ? "bg-primary text-primary-foreground"
                  : "bg-neutral-100/80 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:text-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <RotateCcw
                style={{
                  transform: `rotate(-${loopSpin}deg)`,
                  transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                className="size-4 shrink-0"
              />
              <span className="ml-2 whitespace-nowrap text-xs font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {isLooping ? "Loop Aktif" : "Loop"}
              </span>
            </button>
          )}

          {/* 4. Volume & Mute Toggle dengan Hover Expand & Popover Slider */}
          {!isTikTok && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVolumeSlider((prev) => !prev)}
                onDoubleClick={handleToggleMute}
                title="Volume"
                className={`group flex h-9 w-max max-w-[36px] hover:max-w-[160px] items-center overflow-hidden px-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-xs ${
                  showVolumeSlider
                    ? "bg-primary text-primary-foreground max-w-[160px]"
                    : isMuted || volume === 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-neutral-100/80 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:text-neutral-200 dark:hover:bg-neutral-700"
                }`}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="size-4 shrink-0" />
                ) : volume < 0.5 ? (
                  <Volume1 className="size-4 shrink-0" />
                ) : (
                  <Volume2 className="size-4 shrink-0" />
                )}
                <span
                  className={`ml-2 whitespace-nowrap text-xs font-bold transition-opacity duration-200 ${
                    showVolumeSlider ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  Volume
                </span>
              </button>

              {/* Popover Slider Volume */}
              <AnimatePresence>
                {showVolumeSlider && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 8 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 border border-neutral-200 bg-white/95 px-3 py-2 shadow-2xl backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95"
                  >
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className="text-neutral-700 dark:text-neutral-300 hover:text-foreground cursor-pointer"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="size-4 text-destructive" />
                      ) : (
                        <Volume2 className="size-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setVolume(v);
                        if (isMuted && v > 0) setIsMuted(false);
                        if (v === 0) setIsMuted(true);
                      }}
                      className="h-1.5 w-20 accent-primary cursor-pointer"
                    />
                    <span className="w-8 text-[11px] font-bold text-muted-foreground text-right">
                      {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
