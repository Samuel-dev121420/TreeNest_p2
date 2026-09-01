import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function DateTimeWidget() {
  const location = useLocation();
  const now = useNow();

  // Sembunyikan di halaman Moderasi Admin dan Login
  if (location.pathname === "/admin" || location.pathname === "/login") {
    return null;
  }

  const tanggal = now
    ? `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`
    : "";
  const jam = now
    ? `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`
    : "";

  return (
    <>
      {/* Tanggal (Kiri Atas) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="fixed left-4 top-4 z-40 flex items-center gap-2 rounded-2xl border border-primary/50 bg-gradient-soft px-3.5 py-1.5 text-xs sm:text-sm font-bold text-foreground shadow-soft backdrop-blur-md hover:border-white cursor-pointer select-none"
      >
        <Calendar className="size-3.5 shrink-0 text-primary opacity-90" />
        <span>{tanggal || "Memuat..."}</span>
      </motion.div>

      {/* Jam WIB (Kanan Atas) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="fixed right-4 top-4 z-40 flex items-center gap-1.5 rounded-2xl border border-primary/50 bg-gradient-soft px-3.5 py-1.5 text-xs sm:text-sm font-bold text-foreground shadow-soft backdrop-blur-md hover:border-white cursor-pointer select-none"
      >
        <Clock className="size-3.5 shrink-0 text-primary opacity-90" />
        <span>{jam ? `${jam} WIB` : "Memuat..."}</span>
      </motion.div>
    </>
  );
}
