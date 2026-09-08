import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import { isSoundEnabled, setSoundEnabled, playTapPop } from "@/lib/sound-fx";

export function SoundToggleWidget() {
  const [soundActive, setSoundActive] = useState(true);

  useEffect(() => {
    setSoundActive(isSoundEnabled());
    const handleSfxChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail) {
        setSoundActive(customEvent.detail.enabled);
      }
    };
    window.addEventListener("treenest_sfx_toggle", handleSfxChange);
    return () => window.removeEventListener("treenest_sfx_toggle", handleSfxChange);
  }, []);

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) playTapPop(0);
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleSound}
      className="fixed right-4 bottom-5 z-40 flex items-center gap-2 rounded-2xl border border-primary/40 bg-card/90 dark:bg-card/95 px-3.5 py-2 text-xs font-bold text-foreground shadow-float backdrop-blur-md transition-all hover:border-primary cursor-pointer select-none"
      title={soundActive ? "Nonaktifkan Efek Suara (Mute)" : "Aktifkan Efek Suara (Unmute)"}
      aria-label="Toggle Sound FX"
    >
      {soundActive ? (
        <Volume2 className="size-3.5 text-primary shrink-0" />
      ) : (
        <VolumeX className="size-3.5 text-muted-foreground shrink-0" />
      )}
      <span className="text-[11px] font-bold">{soundActive ? "Suara Aktif" : "Suara Senyap"}</span>
    </motion.button>
  );
}
