import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Search,
  X,
  Calendar as CalendarIcon,
  ChevronDown,
  AlertCircle,
  Bell,
  Pencil,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ToolHeader } from "@/components/ToolHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { generateId, todayKey, formatDateLabel, type DailyTask } from "@/lib/grow-tools";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/grow/dailytask")({
  head: () => ({
    meta: [
      { title: "Reminder — Pengingat Aktivitas TreeNest" },
      { name: "description", content: "Atur pengingat dan checklist aktivitas harianmu di TreeNest." },
      { property: "og:title", content: "Reminder — Pengingat Aktivitas TreeNest" },
      { property: "og:description", content: "Atur pengingat dan checklist aktivitas harianmu di TreeNest." },
    ],
  }),
  component: ReminderPage,
});

function ReminderPage() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";
  const [tasks, setTasks] = useLocalStorage<DailyTask[]>(`treenest.dailytask.tasks.${uid}`, []);
  const [dateKey, setDateKey] = useState(todayKey);
  const [newTask, setNewTask] = useState("");
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [editText, setEditText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  const todayStr = todayKey();

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

  // Group unchecked reminders for today and past days (date <= today)
  const uncheckedSummary = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      if (!t.done && t.date <= todayStr) {
        map.set(t.date, (map.get(t.date) || 0) + 1);
      }
    });
    const result: Array<{ date: string; count: number }> = [];
    map.forEach((count, d) => {
      result.push({ date: d, count });
    });
    return result.sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [tasks, todayStr]);

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

  function openEditTask(task: DailyTask) {
    setEditingTask(task);
    setEditText(task.text);
  }

  function handleSaveEditTask() {
    if (!editingTask || !editText.trim()) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === editingTask.id ? { ...t, text: editText.trim() } : t)),
    );
    setEditingTask(null);
    setEditText("");
  }

  return (
    <PageShell title="" description="">
      <ToolHeader
        title="Reminder"
        description="Pengingat dan checklist aktivitas harian berdasarkan tanggal."
      />

      <div className="mx-auto max-w-2xl space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pengingat..."
            className="w-full rounded-2xl border border-input bg-card py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none shadow-soft focus:ring-2 focus:ring-ring"
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

        {/* Search Results Indicator Banner */}
        {searchQuery && (
          <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              Hasil pencarian untuk "<strong>{searchQuery}</strong>" ({filteredDayTasks.length} item
              ditemukan)
            </span>
          </div>
        )}

        {/* Unchecked Reminders Summary Section (Di atas agar langsung terlihat) */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between gap-2 mb-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-sun shrink-0" />
              <h3 className="text-sm font-bold text-foreground">
                Pengingat Belum Dicentang
              </h3>
            </div>
            {uncheckedSummary.length > 0 && (
              <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-[11px] font-bold text-destructive">
                {uncheckedSummary.reduce((acc, curr) => acc + curr.count, 0)} tugas
              </span>
            )}
          </div>

          {uncheckedSummary.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Semua pengingat hari ini dan sebelumnya sudah selesai! 🎉
            </p>
          ) : (
            <div className="space-y-2.5">
              {uncheckedSummary.map((item) => (
                <div
                  key={item.date}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-2xl border p-3.5 text-xs transition-all ${
                    item.date === dateKey
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/60 bg-secondary/30 hover:bg-secondary/60"
                  }`}
                >
                  <div>
                    <p className="font-bold text-foreground">
                      {formatDateLabel(item.date)}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      Anda mempunyai <strong className="text-destructive">{item.count}</strong> pengingat yang belum dicentang pada tanggal ini.
                    </p>
                  </div>

                  <button
                    onClick={() => setDateKey(item.date)}
                    className="shrink-0 flex items-center justify-center gap-1 rounded-xl bg-primary/15 px-3 py-1.5 font-bold text-primary transition-all hover:bg-primary/25 active:scale-95 cursor-pointer"
                  >
                    Buka Tanggal Ini <ChevronRight className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date navigator + Calendar Quick Picker Trigger */}
        <div className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-soft">
          <button
            onClick={() => shiftDate(-1)}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Hari sebelumnya"
          >
            <ChevronLeft className="size-5" />
          </button>
          
          <button
            onClick={() => setShowDatePickerModal(true)}
            className="group flex flex-col items-center rounded-2xl px-3 py-1.5 transition-all hover:bg-secondary/60 active:scale-95"
            title="Pilih tanggal cepat"
          >
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {formatDateLabel(dateKey)}
              </p>
              <ChevronDown className="size-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-y-0.5" />
            </div>
            {dateKey === todayStr ? (
              <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                Hari ini
              </span>
            ) : null}
          </button>

          <button
            onClick={() => shiftDate(1)}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Hari berikutnya"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">Progres Pengingat</span>
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
        <div className="flex gap-2 min-w-0">
          <input
            maxLength={150}
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Tambah pengingat baru..."
            className="min-w-0 flex-1 rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addTask}
            disabled={!newTask.trim()}
            aria-label="Tambah pengingat"
            className="shrink-0 flex items-center justify-center rounded-xl bg-primary px-4 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="size-5" />
          </button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filteredDayTasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title={searchQuery ? "Pengingat tidak ditemukan" : "Belum ada pengingat"}
              description={
                searchQuery
                  ? "Coba kata kunci lain."
                  : `Tambah tugas untuk hari ${formatDateLabel(dateKey)}.`
              }
            />
          ) : (
            filteredDayTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 transition-colors hover:border-border min-w-0 shadow-xs"
              >
                <button
                  onClick={() => toggleTask(t.id)}
                  className={`flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors self-center cursor-pointer ${
                    t.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 hover:border-primary/50"
                  }`}
                >
                  {t.done ? <CheckSquare className="size-3.5" /> : null}
                </button>
                <span
                  className={`min-w-0 flex-1 self-center py-0.5 text-sm font-medium leading-normal break-words [word-break:break-word] overflow-hidden ${
                    t.done ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {t.text}
                </span>
                <div className="flex items-center gap-1 shrink-0 self-center">
                  <button
                    onClick={() => openEditTask(t)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary cursor-pointer"
                    title="Edit Pengingat"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    title="Hapus Pengingat"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MODAL KALENDER / QUICK DATE PICKER ── */}
      {showDatePickerModal && (
        <div
          onClick={() => setShowDatePickerModal(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 shadow-float space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Pilih Tanggal</h3>
              </div>
              <button
                onClick={() => setShowDatePickerModal(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                Pilih Tanggal, Bulan, dan Tahun:
              </label>
              <input
                type="date"
                value={dateKey}
                onChange={(e) => {
                  if (e.target.value) {
                    setDateKey(e.target.value);
                  }
                }}
                className="w-full rounded-2xl border border-input bg-white dark:bg-secondary/80 text-foreground px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDateKey(todayStr);
                  setShowDatePickerModal(false);
                }}
                className="flex-1 rounded-xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary/70"
              >
                Kembali ke Hari Ini
              </button>
              <button
                onClick={() => setShowDatePickerModal(false)}
                className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT PENGINGAT ── */}
      {editingTask && (
        <div
          onClick={() => setEditingTask(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-float space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="size-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Edit Pengingat</h3>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                Teks Pengingat:
              </label>
              <input
                autoFocus
                maxLength={150}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEditTask()}
                placeholder="Ketik teks pengingat..."
                className="w-full rounded-xl border border-input bg-white dark:bg-secondary/80 text-foreground px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 rounded-xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary/70 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEditTask}
                disabled={!editText.trim()}
                className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
