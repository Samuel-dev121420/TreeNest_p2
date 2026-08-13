import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckSquare, ChevronLeft, ChevronRight, Plus, Trash2, Search, X } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ToolHeader } from "@/components/ToolHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { generateId, todayKey, formatDateLabel, type DailyTask } from "@/lib/grow-tools";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/grow/dailytask")({
  head: () => ({
    meta: [
      { title: "Daily Task — Tugas Harian TreeNest" },
      { name: "description", content: "Atur checklist aktivitas harianmu di TreeNest." },
      { property: "og:title", content: "Daily Task — Tugas Harian TreeNest" },
      { property: "og:description", content: "Atur checklist aktivitas harianmu di TreeNest." },
    ],
  }),
  component: DailyTaskPage,
});

function DailyTaskPage() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";
  const [tasks, setTasks] = useLocalStorage<DailyTask[]>(`treenest.dailytask.tasks.${uid}`, []);
  const [dateKey, setDateKey] = useState(todayKey);
  const [newTask, setNewTask] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.date === dateKey).sort((a, b) => b.createdAt - a.createdAt),
    [tasks, dateKey],
  );

  const filteredDayTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dayTasks;
    return dayTasks.filter((t) => t.text.toLowerCase().includes(q));
  }, [dayTasks, searchQuery]);
  const completedCount = useMemo(() => dayTasks.filter((t) => t.done).length, [dayTasks]);
  const progress = useMemo(
    () => (dayTasks.length ? (completedCount / dayTasks.length) * 100 : 0),
    [dayTasks, completedCount],
  );

  function shiftDate(days: number) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const next = new Date(y!, m! - 1, d!);
    next.setDate(next.getDate() + days);
    setDateKey(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
    );
  }

  function addTask() {
    const text = newTask.trim();
    if (!text) return;
    const task: DailyTask = {
      id: generateId(),
      date: dateKey,
      text,
      done: false,
      createdAt: Date.now(),
    };
    setTasks((prev) => [task, ...prev]);
    setNewTask("");
  }

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <PageShell title="" description="">
      <ToolHeader
        title="Daily Task"
        description="Checklist aktivitas harian, satu hari satu fokus."
      />

      <div className="mx-auto max-w-xl">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tugas harian..."
            className="w-full rounded-2xl border border-input bg-card py-2.5 pl-10 pr-9 text-sm outline-none shadow-soft focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-soft">
          <button
            onClick={() => shiftDate(-1)}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Hari sebelumnya"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{formatDateLabel(dateKey)}</p>
            {dateKey === todayKey() ? (
              <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                Hari ini
              </span>
            ) : null}
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Hari berikutnya"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="mt-4 rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">Progres hari ini</span>
            <span className="text-muted-foreground">
              {completedCount}/{dayTasks.length}
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-leaf transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Input */}
        <div className="mt-4 flex gap-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Tambah tugas baru..."
            className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addTask}
            disabled={!newTask.trim()}
            aria-label="Tambah tugas"
            className="flex items-center justify-center rounded-xl bg-primary px-4 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="size-5" />
          </button>
        </div>

        {/* List */}
        <div className="mt-4 space-y-2">
          {filteredDayTasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title={searchQuery ? "Tugas tidak ditemukan" : "Belum ada tugas"}
              description={searchQuery ? "Coba kata kunci lain." : "Tambah tugas untuk hari ini."}
            />
          ) : (
            filteredDayTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition-colors hover:border-border"
              >
                <button
                  onClick={() => toggleTask(t.id)}
                  className={`flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                    t.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {t.done ? <CheckSquare className="size-3.5" /> : null}
                </button>
                <span
                  className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                >
                  {t.text}
                </span>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
