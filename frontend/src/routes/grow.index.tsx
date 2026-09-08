import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { ToolCard } from "@/components/ToolCard";
import { FileText, Layers, Clock, CheckSquare } from "lucide-react";
import { getStudyTimerSnapshot, subscribeStudyTimer } from "@/lib/study-timer-service";
import { hasUncheckedReminders } from "@/lib/grow-tools";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/grow/")({
  head: () => ({
    meta: [
      { title: "Grow — Workspace Produktif TreeNest" },
      {
        name: "description",
        content:
          "PiNote, FlashCard, Study Session, dan Reminder: empat tools produktivitas modern untuk membantumu fokus belajar dan tumbuh setiap hari.",
      },
      { property: "og:title", content: "Grow — Workspace Produktif TreeNest" },
      {
        property: "og:description",
        content: "Empat tools modern untuk belajar, mencatat, dan mengatur aktivitas harianmu.",
      },
    ],
  }),
  component: GrowPage,
});

function GrowPage() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";
  const username = profile?.username || "Pengguna";

  const [hasStudyBadge, setHasStudyBadge] = useState(false);
  const [hasReminderBadge, setHasReminderBadge] = useState(false);

  useEffect(() => {
    const update = () => {
      const timerSnap = getStudyTimerSnapshot();
      setHasStudyBadge(timerSnap.status === "running" || timerSnap.status === "completed");
      setHasReminderBadge(hasUncheckedReminders(uid));
    };

    update();
    const unsub = subscribeStudyTimer(update);
    const interval = setInterval(update, 2000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [uid]);

  const tools = [
    {
      to: "/grow/pinote",
      title: "PiNote",
      description: "Kelola folder, buat catatan terstruktur, dan simpan lampiran file penting dalam satu tempat rapi.",
      icon: FileText,
      color: "leaf" as const,
      tagLabel: "Catatan & File",
      statusText: "Folder & catatan terorganisir",
    },
    {
      to: "/grow/flashcard",
      title: "FlashCard",
      description: "Latih daya ingat dan pahami konsep belajar secara efektif dengan kartu tanya-jawab interaktif.",
      icon: Layers,
      color: "sky" as const,
      tagLabel: "Metode Belajar",
      statusText: "Latih memori & pemahaman",
    },
    {
      to: "/grow/study",
      title: "Study Session",
      description: "Tingkatkan fokus belajar dengan timer yang dapat disesuaikan dengan ritme produktivitasmu.",
      icon: Clock,
      color: "sun" as const,
      tagLabel: "Timer Fokus",
      showBadge: hasStudyBadge,
      statusText: hasStudyBadge ? "Sesi belajar sedang aktif" : "Siap untuk sesi belajar",
    },
    {
      to: "/grow/dailytask",
      title: "Reminder",
      description: "Susun daftar checklist harian dan pengingat tugas agar semua target dapat tuntas tepat waktu.",
      icon: CheckSquare,
      color: "wood" as const,
      tagLabel: "Checklist Target",
      showBadge: hasReminderBadge,
      statusText: hasReminderBadge ? "Ada pengingat yang perlu dicek" : "Semua target harian rapi",
    },
  ];

  return (
    <PageShell>

      {/* ── Main Productivity Tools Grid ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        {tools.map((t) => (
          <ToolCard key={t.to} {...t} />
        ))}
      </div>
    </PageShell>
  );
}
