import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Check, Move, Sparkles } from "lucide-react";
import { useScrollLock } from "@/hooks/use-scroll-lock";

interface ImageCropperModalProps {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const CROP_BOX_SIZE = 280; // Ukuran kotak crop di layar (px)
const OUTPUT_SIZE = 360; // Ukuran export gambar final (px)

export function ImageCropperModal({
  imageSrc,
  onCropComplete,
  onCancel,
}: ImageCropperModalProps) {
  useScrollLock(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState<{
    baseWidth: number;
    baseHeight: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);

  // Hitung ukuran proporsional saat gambar dimuat
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 500;
    const nh = img.naturalHeight || 500;

    // Cover: dimensi terkecil pas dengan CROP_BOX_SIZE
    const scale = Math.max(CROP_BOX_SIZE / nw, CROP_BOX_SIZE / nh);
    setImgDimensions({
      baseWidth: nw * scale,
      baseHeight: nh * scale,
      naturalWidth: nw,
      naturalHeight: nh,
    });
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Drag / Pan handler
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(3, Math.max(0.8, Number((prev + delta).toFixed(2)))));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleResetCrop = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Crop & Export via Canvas (100% presisi selaras dengan tampilan DOM)
  const handleApplyCrop = useCallback(() => {
    if (!imgRef.current || !imgDimensions) return;

    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Isi background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const scaleFactor = OUTPUT_SIZE / CROP_BOX_SIZE;

    ctx.save();

    // Pindah ke titik pusat canvas output
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

    // Rotasi dari titik pusat
    ctx.rotate((rotation * Math.PI) / 180);

    // Geser offset pan yang diskalakan ke ukuran canvas
    ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);

    // Ukuran gambar setelah zoom & scaling
    const drawW = imgDimensions.baseWidth * zoom * scaleFactor;
    const drawH = imgDimensions.baseHeight * zoom * scaleFactor;

    // Gambar di tengah
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

    // Export sebagai JPEG terkompresi berkualitas tinggi (~35KB-50KB)
    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
    onCropComplete(croppedDataUrl);
  }, [offset, zoom, rotation, imgDimensions, onCropComplete]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-float animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">Sesuaikan Foto Profil</h2>
              <p className="text-xs text-muted-foreground">Geser dan atur ukuran foto (Rasio 1:1)</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Tutup"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Viewport Cropper Kotak 1:1 */}
        <div className="my-4 flex flex-col items-center">
          <div
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-neutral-950 shadow-inner select-none cursor-grab active:cursor-grabbing touch-none"
            style={{ width: `${CROP_BOX_SIZE}px`, height: `${CROP_BOX_SIZE}px` }}
          >
            {/* Foto yang dirender proporsional */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Foto yang akan di-crop"
              draggable={false}
              onLoad={handleImageLoaded}
              className="pointer-events-none absolute max-w-none origin-center transition-transform duration-75"
              style={
                imgDimensions
                  ? {
                      width: `${imgDimensions.baseWidth * zoom}px`,
                      height: `${imgDimensions.baseHeight * zoom}px`,
                      transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
                      opacity: 1,
                    }
                  : { opacity: 0 }
              }
            />

            {/* Circular Avatar Guide Overlay (Bayangan di luar lingkaran) */}
            <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-1 ring-black/30" />

            {/* Grid Panduan Komposisi */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-25">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>

            {/* Hint geser */}
            <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-xs">
              <Move className="size-3" /> Geser Foto
            </div>
          </div>

          {/* Kontrol Zoom & Rotasi */}
          <div className="mt-4 w-full space-y-2 px-1">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.15).toFixed(2))))}
                className="flex size-8 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-foreground hover:bg-secondary transition-colors"
                title="Perkecil"
              >
                <ZoomOut className="size-3.5" />
              </button>

              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0.8"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                />
                <span className="w-10 text-right font-mono text-xs font-bold text-foreground">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))}
                className="flex size-8 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-foreground hover:bg-secondary transition-colors"
                title="Perbesar"
              >
                <ZoomIn className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={handleRotate}
                className="flex size-8 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-foreground hover:bg-secondary transition-colors"
                title="Putar 90°"
              >
                <RotateCw className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetCrop}
                className="flex items-center gap-1 rounded-xl border border-border/70 bg-secondary/80 px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Reset posisi foto dan zoom ke semula (tengah)"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="mt-4 flex gap-2.5 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-border/70 bg-secondary/80 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-secondary active:scale-[0.98]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-leaf py-2.5 text-sm font-bold text-white shadow-soft transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <Check className="size-4" />
            Gunakan Foto
          </button>
        </div>
      </div>
    </div>
  );
}
