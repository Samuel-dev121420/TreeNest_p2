import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LogOut, Sparkles, Pencil, Check, X, Sprout, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/lib/auth-context";
import { seedProfile, type Profile } from "@/lib/social";
import { stageForLevel, expNeeded, TREEHOUSE_LEVEL, TREE_STAGES } from "@/lib/treenest";
import { updateUserProfile } from "@/lib/firestore-service";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — Profil TreeNest Kamu" },
      {
        name: "description",
        content:
          "Lihat foto profil, username, ID Akun, email, level, dan jumlah teman TreeNest kamu.",
      },
      { property: "og:title", content: "Account — Profil TreeNest Kamu" },
      {
        property: "og:description",
        content: "Informasi dasar akun TreeNest dan pengaturan sederhana.",
      },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { profile: authProfile, logout, refreshProfile } = useAuth();

  const activeProfile: Profile = authProfile || seedProfile();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Profile>(activeProfile);

  const stage = useMemo(() => stageForLevel(activeProfile.level), [activeProfile.level]);
  const need = expNeeded(activeProfile.level);
  const expPct = Math.min(100, Math.round((activeProfile.exp / need) * 100));
  const stageIndex = TREE_STAGES.findIndex((s) => s.key === stage.key);

  function startEdit() {
    setDraft(activeProfile);
    setEditing(true);
  }

  async function saveEdit() {
    if (!authProfile?.uid) return;
    const username = draft.username.trim();
    const bio = draft.bio?.trim() ?? "";
    if (!username) return;
    setSaving(true);
    await updateUserProfile(authProfile.uid, { username, bio });
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(activeProfile);
    setEditing(false);
  }

  async function handleLogout() {
    await logout();
    navigate({ to: "/login" });
  }

  return (
    <PageShell title="Account" description="Informasi dasar akunmu.">
      {/* Kartu profil utama */}
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
        <div className="h-20 bg-gradient-leaf" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            <span
              className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-primary-foreground shadow-float ring-4 ring-card"
              style={{
                backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${activeProfile.hue}), oklch(0.66 0.13 ${activeProfile.hue + 25}))`,
              }}
            >
              {activeProfile.initials}
            </span>
            {!editing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70"
              >
                <Pencil className="size-3.5" /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  <Check className="size-3.5" /> {saving ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  onClick={cancelEdit}
                  aria-label="Batal edit"
                  className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="mt-4 space-y-3">
              <Field label="Username">
                <input
                  value={draft.username}
                  onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              <Field label="Bio">
                <textarea
                  value={draft.bio}
                  onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{activeProfile.username}</h2>
                {authProfile?.role === "admin" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" /> Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">ID {activeProfile.accountId}</p>
              {activeProfile.bio ? (
                <p className="mt-2 text-sm text-muted-foreground">{activeProfile.bio}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoCard label="Email" value={activeProfile.email} muted={activeProfile.email === "—"} />
        <InfoCard label="Jumlah Teman" value={String(activeProfile.friendCount)} />
      </div>

      {/* Progress pohon */}
      <div className="mt-4 rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Sprout className="size-4 text-leaf" /> Pertumbuhan Pohon
          </h3>
          <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf">
            Lv {activeProfile.level}
          </span>
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">{stage.label}</p>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-leaf transition-[width] duration-700"
            style={{ width: `${expPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {activeProfile.exp} / {need} EXP · Rumah Pohon terbuka di Level {TREEHOUSE_LEVEL}
        </p>

        {/* Jalur tahap pohon */}
        <div className="mt-4 flex items-center justify-between gap-1">
          {TREE_STAGES.map((s, i) => {
            const reached = i <= stageIndex;
            const current = i === stageIndex;
            return (
              <div key={s.key} className="flex flex-1 flex-col items-center gap-1 text-center">
                <div
                  className={`flex size-9 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                    current
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : reached
                        ? "bg-leaf/15 text-leaf"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-[9px] leading-tight ${reached ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Akses Admin jika Admin */}
      {authProfile?.role === "admin" && (
        <div className="mt-4 rounded-3xl border border-primary/30 bg-primary/10 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
            <ShieldCheck className="h-4 w-4" /> Mode Admin Aktif
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Kamu sedang masuk dengan akun Admin. Kamu dapat memoderasi video TreeGallery yang
            diunggah pengguna.
          </p>
          <button
            onClick={() => navigate({ to: "/admin" as any })}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft transition-all hover:opacity-90"
          >
            Buka Panel Moderasi Admin ↗
          </button>
        </div>
      )}

      {/* Sesi & Logout */}
      <div className="mt-4 rounded-3xl border border-border/70 bg-card p-5 text-center shadow-soft">
        <Sparkles className="mx-auto size-5 text-sun" />
        <p className="mt-2 text-sm font-semibold text-foreground">Sesi Pengguna</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Akun kamu tersambung dengan sistem autentikasi TreeNest.
        </p>
        <button
          onClick={handleLogout}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-destructive/10 px-5 py-2.5 text-sm font-bold text-destructive transition-all hover:bg-destructive/20 active:scale-95"
        >
          <LogOut className="size-4" /> Logout dari Akun
        </button>
      </div>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoCard({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-sm font-bold ${muted ? "text-muted-foreground" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
