import React, { useEffect, useRef, useState } from "react";

export interface EmojiItem {
  char: string;
  name: string;
}

export const POPULAR_TIKTOK_EMOJIS: EmojiItem[] = [
  { char: "😃", name: "Senyum Lebar" },
  { char: "😂", name: "Tertawa Bahagia" },
  { char: "🤣", name: "Tertawa Terbahak" },
  { char: "🥹", name: "Terharu Menahan Air Mata" },
  { char: "🥰", name: "Penuh Cinta" },
  { char: "😍", name: "Jatuh Cinta" },
  { char: "🥺", name: "Memelas / Memohon" },
  { char: "😭", name: "Menangis Keras" },
  { char: "😡", name: "Marah" },
  { char: "😳", name: "Malu / Terkejut" },
  { char: "💀", name: "Tengkorak / Mati Konyol" },
  { char: "👏", name: "Tepuk Tangan" },
  { char: "🔥", name: "Api / Keren Banget" },
  { char: "✨", name: "Berkilau" },
  { char: "❤️", name: "Hati Merah" },
  { char: "👍", name: "Jempol / Bagus" },
  { char: "🙏", name: "Tolong / Terima Kasih" },
  { char: "💯", name: "Nilai 100 / Sempurna" },
  { char: "🥳", name: "Pesta" },
  { char: "😎", name: "Keren" },
  { char: "😋", name: "Enak / Lezat" },
  { char: "😜", name: "Melet / Usil" },
  { char: "🤪", name: "Gila / Lucu" },
  { char: "🤩", name: "Kagum Berbintang" },
  { char: "🤤", name: "Ngeces" },
  { char: "😴", name: "Tidur" },
  { char: "🤫", name: "Rahasia / Diam" },
  { char: "🤔", name: "Berpikir" },
  { char: "🤯", name: "Pikiran Meledak" },
  { char: "😱", name: "Histeris Teriak" },
  { char: "😤", name: "Kesal / Menggerutu" },
  { char: "🤬", name: "Mengumpat" },
  { char: "🤡", name: "Badut" },
  { char: "👻", name: "Hantu" },
  { char: "🤝", name: "Jabat Tangan" },
  { char: "✌️", name: "Damai / Peace" },
  { char: "🫰", name: "Love Korea" },
  { char: "💖", name: "Hati Berkilau" },
  { char: "💔", name: "Patah Hati" },
  { char: "🎉", name: "Konfeti / Perayaan" },
];

const DEFAULT_RECENT_EMOJIS = ["😂", "🥰", "🥺", "😭", "👍", "❤️"];
const STORAGE_KEY_RECENT = "treenest_recent_emojis";

// Fallback dictionary for legacy [smile] codes if any exist in chat history
const LEGACY_CODE_TO_EMOJI: Record<string, string> = {
  "[smile]": "😃",
  "[happy]": "😄",
  "[joyful]": "😂",
  "[laughwithtears]": "🤣",
  "[loveface]": "🥰",
  "[cute]": "🥹",
  "[cool]": "😎",
  "[yummy]": "😋",
  "[wronged]": "🥺",
  "[cry]": "😭",
  "[weep]": "😭",
  "[tears]": "🥹",
  "[angry]": "😡",
  "[rage]": "🤬",
  "[shock]": "😱",
  "[scream]": "😱",
  "[flushed]": "😳",
  "[embarrassed]": "😳",
  "[thinking]": "🤔",
  "[speechless]": "😶",
  "[slap]": "🤦",
  "[evil]": "😈",
  "[nap]": "😴",
  "[proud]": "😤",
};

/**
 * Cek apakah isi pesan murni HANYA terdiri dari emote (dan spasi)
 */
export function isMessageOnlyEmojis(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Hapus semua karakter emoji, ZWJ, dan modifier
  const nonEmoji = trimmed
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200d|\ufe0f/gu, "")
    .trim();

  return nonEmoji.length === 0;
}

/**
 * Render pesan chat: jika ada kode lama [happy], otomatis diubah jadi emoji 😃
 */
export function renderMessageWithEmotes(text: string): React.ReactNode {
  if (!text) return text;

  let processed = text;
  for (const [code, emoji] of Object.entries(LEGACY_CODE_TO_EMOJI)) {
    if (processed.includes(code)) {
      processed = processed.replaceAll(code, emoji);
    }
  }

  return processed;
}

interface TikTokEmotePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmote: (emojiChar: string) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  placement?: "top" | "bottom";
  align?: "left" | "right";
  className?: string;
}

export function TikTokEmotePicker({
  isOpen,
  onClose,
  onSelectEmote,
  triggerRef,
  placement = "top",
  align = "right",
  className,
}: TikTokEmotePickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(DEFAULT_RECENT_EMOJIS);

  // Load recent emojis from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentEmojis(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSelect = (emojiChar: string) => {
    onSelectEmote(emojiChar);

    // Update recent emojis
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emojiChar);
      const updated = [emojiChar, ...filtered].slice(0, 6);
      try {
        localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Close on outside click, ignoring the trigger button
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (pickerRef.current && pickerRef.current.contains(target)) {
        return;
      }
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const placementClass =
    placement === "bottom"
      ? "top-[calc(100%+8px)]"
      : "bottom-[calc(100%+8px)]";
  const alignClass = align === "left" ? "left-0" : "right-0";

  return (
    <div
      ref={pickerRef}
      className={`absolute ${placementClass} ${alignClass} z-50 w-[290px] sm:w-[320px] rounded-3xl border border-border/80 bg-card/95 p-3 backdrop-blur-xl shadow-float animate-pop-in select-none flex flex-col gap-2.5 ${className || ""}`}
    >
      {/* Grid Emojis Utama */}
      <div className="grid grid-cols-6 gap-1 max-h-[190px] overflow-y-auto pr-1 chat-input-scrollbar">
        {POPULAR_TIKTOK_EMOJIS.map(({ char, name }) => (
          <button
            key={char}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              handleSelect(char);
            }}
            className="flex size-10 items-center justify-center rounded-full text-2xl transition-colors hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20 cursor-pointer"
            title={name}
          >
            <span className="select-none leading-none">{char}</span>
          </button>
        ))}
      </div>

      {/* Balok Riwayat Emote (Fixed di Bawah) */}
      <div className="pt-2 border-t border-border/70 flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
          Riwayat Terakhir
        </span>
        <div className="flex items-center justify-between px-1">
          {recentEmojis.map((char) => (
            <button
              key={`recent-${char}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                handleSelect(char);
              }}
              className="flex size-9 items-center justify-center rounded-full text-2xl transition-colors hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20 cursor-pointer"
              title="Gunakan lagi"
            >
              <span className="select-none leading-none">{char}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
