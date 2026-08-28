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
      { title: "Grow — Tools Produktif TreeNest" },
      {
        name: "description",
        content:
          "PiNote, FlashCard, Study Session, dan Reminder: empat tools sederhana untuk membantumu tetap produktif.",
      },
      { property: "og:title", content: "Grow — Tools Produktif TreeNest" },
      {
        property: "og:description",
        content: "Empat tools sederhana untuk belajar dan mengatur aktivitas harianmu.",
      },
    ],
  }),
  component: GrowPage,
});

function GrowPage() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";

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
      description: "Folder, catatan, dan file dalam satu tempat rapi.",
      icon: FileText,
      color: "leaf" as const,
    },
    {
      to: "/grow/flashcard",
      title: "FlashCard",
      description: "Belajar dengan kartu depan-belakang.",
      icon: Layers,
      color: "sky" as const,
    },
    {
      to: "/grow/study",
      title: "Study Session",
      description: "Fokus belajar dalam durasi yang kamu tentukan.",
      icon: Clock,
      color: "sun" as const,
      showBadge: hasStudyBadge,
    },
    {
      to: "/grow/dailytask",
      title: "Reminder",
      description: "Checklist pengingat aktivitas berdasarkan tanggal.",
      icon: CheckSquare,
      color: "wood" as const,
      showBadge: hasReminderBadge,
    },
  ];

  return (
    <PageShell title="Grow" description="Pilih tools yang ingin kamu pakai hari ini.">
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((t) => (
          <ToolCard key={t.to} {...t} />
        ))}
      </div>
    </PageShell>
  );
}
