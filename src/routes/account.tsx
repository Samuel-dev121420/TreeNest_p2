import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  LogOut,
  Sparkles,
  Pencil,
  Check,
  X,
  Sprout,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  Camera,
  LogIn,
  Moon,
  Sun,
  Globe,
  Lock,
  UserCheck,
  AlertTriangle,
  Trash2,
  Instagram,
  Github,
  Twitter,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/lib/auth-context";
import { seedProfile } from "@/lib/social";
import type { SocialLink, SocialPlatform, VisibilityLevel } from "@/lib/social";
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

// ─── PLATFORM CONFIG ─────────────────────────────────────────────────────────

type PlatformMeta = {
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PLATFORMS: Record<SocialPlatform, PlatformMeta> = {
  instagram: {
    label: "Instagram",
    placeholder: "@username",
    icon: Instagram,
  },
  github: {
    label: "GitHub",
    placeholder: "username",
    icon: Github,
  },
  x: {
    label: "X (Twitter)",
    placeholder: "@username",
    icon: Twitter,
  },
  tiktok: {
    label: "TikTok",
    placeholder: "@username",
    icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.79 1.52V6.7a4.85 4.85 0 01-1.02-.01z" />
      </svg>
    ),
  },
  whatsapp: {
    label: "WhatsApp",
    placeholder: "+62812...",
    icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
  },
};

const VISIBILITY_OPTS: { value: VisibilityLevel; label: string; icon: typeof Globe }[] = [
  { value: "public", label: "Publik", icon: Globe },
  { value: "friends_only", label: "Teman", icon: UserCheck },
  { value: "private", label: "Privat", icon: Lock },
];

// ─── IMAGE RESIZE HELPER ─────────────────────────────────────────────────────

function resizeImageFile(file: File, maxPx = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height, maxPx);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        // Center-crop to square
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── DELETE MODAL ────────────────────────────────────────────────────────────

type DeleteStep = "warning" | "phrase" | "email";

function DeleteAccountModal({
  userEmail,
  onClose,
  onConfirm,
}: {
  userEmail: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [step, setStep] = useState<DeleteStep>("warning");
  const [phrase, setPhrase] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const CONFIRM_PHRASE = "HAPUS AKUN SAYA";

  async function handleDelete() {
    if (emailInput.trim().toLowerCase() !== userEmail.trim().toLowerCase()) return;
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-3xl border border-destructive/30 bg-card p-6 shadow-float animate-in fade-in zoom-in-95 duration-200">
        {step === "warning" && (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <AlertTriangle className="size-6 text-destructive" />
            </div>
            <h2 className="mt-4 text-center text-lg font-bold text-foreground">Hapus Akun?</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Tindakan ini <strong className="text-destructive">tidak dapat dibatalkan</strong>. Seluruh data kamu — pohon, teman, video, dan progres EXP — akan <strong>dihapus selamanya</strong>.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/70"
              >
                Batal
              </button>
              <button
                onClick={() => setStep("phrase")}
                className="flex-1 rounded-2xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground hover:bg-destructive/90"
              >
                Lanjutkan
              </button>
            </div>
          </>
        )}

        {step === "phrase" && (
          <>
            <h2 className="text-lg font-bold text-foreground">Konfirmasi Penghapusan</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Ketik <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs font-bold text-destructive">{CONFIRM_PHRASE}</code> untuk melanjutkan.
            </p>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-destructive/50"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setStep("warning")}
                className="flex-1 rounded-2xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/70"
              >
                Kembali
              </button>
              <button
                disabled={phrase !== CONFIRM_PHRASE}
                onClick={() => setStep("email")}
                className="flex-1 rounded-2xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
              >
                Lanjut
              </button>
            </div>
          </>
        )}

        {step === "email" && (
          <>
            <h2 className="text-lg font-bold text-foreground">Verifikasi Email</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Ketik email akun kamu untuk konfirmasi terakhir.
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{userEmail}</p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Masukkan email akun"
              className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-destructive/50"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setStep("phrase")}
                className="flex-1 rounded-2xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/70"
              >
                Kembali
              </button>
              <button
                disabled={emailInput.trim().toLowerCase() !== userEmail.trim().toLowerCase() || deleting}
                onClick={handleDelete}
                className="flex-1 rounded-2xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
              >
                {deleting ? "Menghapus..." : "Hapus Akun"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function AccountPage() {
  const navigate = useNavigate();
  const { profile: authProfile, logout, refreshProfile, sendPasswordReset, deleteAccount } = useAuth();

  const activeProfile = authProfile || seedProfile();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftUsername, setDraftUsername] = useState(activeProfile.username);
  const [draftBio, setDraftBio] = useState(activeProfile.bio ?? "");

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Social links
  const [editingSocial, setEditingSocial] = useState(false);
  const [draftLinks, setDraftLinks] = useState<SocialLink[]>(activeProfile.socialLinks ?? []);
  const [savingSocial, setSavingSocial] = useState(false);

  // Theme
  const [themeLoading, setThemeLoading] = useState(false);
  const isDark = activeProfile.themePreference === "dark";

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Computed
  const stage = useMemo(() => stageForLevel(activeProfile.level), [activeProfile.level]);
  const need = expNeeded(activeProfile.level);
  const expPct = Math.min(100, Math.round((activeProfile.exp / need) * 100));
  const stageIndex = TREE_STAGES.findIndex((s) => s.key === stage.key);

  // ─── handlers ──────────────────────────────────────────────────────────────

  function startEdit() {
    setDraftUsername(activeProfile.username);
    setDraftBio(activeProfile.bio ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    if (!authProfile?.uid) return;
    const username = draftUsername.trim();
    const bio = draftBio.trim();
    if (!username) return;
    setSaving(true);
    await updateUserProfile(authProfile.uid, { username, bio });
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  }

  function cancelEdit() {
    setDraftUsername(activeProfile.username);
    setDraftBio(activeProfile.bio ?? "");
    setEditing(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !authProfile?.uid) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeImageFile(file);
      await updateUserProfile(authProfile.uid, { avatarUrl: dataUrl });
      await refreshProfile();
    } catch (err) {
      console.error("Avatar upload error:", err);
    }
    setUploadingAvatar(false);
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePasswordReset() {
    if (!activeProfile.email || activeProfile.email === "—") return;
    setResetLoading(true);
    const result = await sendPasswordReset(activeProfile.email);
    setResetLoading(false);
    if (result.success) setResetSent(true);
  }

  async function handleThemeToggle() {
    if (!authProfile?.uid) return;
    setThemeLoading(true);
    const newTheme: "light" | "dark" = isDark ? "light" : "dark";
    await updateUserProfile(authProfile.uid, { themePreference: newTheme });
    // Apply immediately
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    await refreshProfile();
    setThemeLoading(false);
  }

  // Social link helpers
  const getLinkForPlatform = useCallback(
    (platform: SocialPlatform) => draftLinks.find((l) => l.platform === platform),
    [draftLinks],
  );

  function setLinkValue(platform: SocialPlatform, value: string) {
    setDraftLinks((prev) => {
      const existing = prev.find((l) => l.platform === platform);
      if (existing) {
        return prev.map((l) =>
          l.platform === platform ? { ...l, value } : l,
        );
      }
      return [...prev, { platform, value, visibility: "public" }];
    });
  }

  function setLinkVisibility(platform: SocialPlatform, visibility: VisibilityLevel) {
    setDraftLinks((prev) =>
      prev.map((l) => (l.platform === platform ? { ...l, visibility } : l)),
    );
  }

  async function saveSocial() {
    if (!authProfile?.uid) return;
    setSavingSocial(true);
    const filtered = draftLinks.filter((l) => l.value.trim() !== "");
    await updateUserProfile(authProfile.uid, { socialLinks: filtered });
    await refreshProfile();
    setSavingSocial(false);
    setEditingSocial(false);
  }

  function startEditSocial() {
    setDraftLinks(activeProfile.socialLinks ?? []);
    setEditingSocial(true);
  }

  async function handleLogout() {
    await logout();
    navigate({ to: "/login" });
  }

  async function handleDeleteAccount() {
    const result = await deleteAccount();
    if (result.success) {
      navigate({ to: "/login" });
    }
  }

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell title="Account" description="Informasi dan pengaturan akunmu.">
      {/* ── Kartu Profil Utama ── */}
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
        <div className="h-20 bg-gradient-leaf" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            {/* Avatar with upload overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative group"
              title="Ganti foto profil"
            >
              {activeProfile.avatarUrl ? (
                <img
                  src={activeProfile.avatarUrl}
                  alt={activeProfile.username}
                  className="size-20 rounded-full object-cover shadow-float ring-4 ring-card"
                />
              ) : (
                <span
                  className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-primary-foreground shadow-float ring-4 ring-card"
                  style={{
                    backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${activeProfile.hue}), oklch(0.66 0.13 ${activeProfile.hue + 25}))`,
                  }}
                >
                  {activeProfile.initials}
                </span>
              )}
              {/* Hover overlay */}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-100">
                {uploadingAvatar ? (
                  <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Camera className="size-5 text-white" />
                )}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

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
                  value={draftUsername}
                  onChange={(e) => setDraftUsername(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              <Field label="Bio">
                <textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
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

      {/* ── Info Akun ── */}
      <div className="mt-4 rounded-3xl border border-border/70 bg-card p-5 shadow-soft space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="size-4 text-sun" /> Info Akun
        </h3>

        {/* Email */}
        <InfoRow label="Email" value={activeProfile.email} />

        {/* Total Login */}
        <InfoRow
          label="Total Login"
          value={String(activeProfile.totalLogins ?? 0)}
          icon={<LogIn className="size-3.5 text-sky-deep" />}
        />

        {/* Jumlah Teman */}
        <InfoRow label="Jumlah Teman" value={String(activeProfile.friendCount)} />

        {/* Password */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <KeyRound className="size-3.5" /> Password
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-input bg-secondary/50 px-3 py-2 text-sm font-mono tracking-widest text-foreground select-none">
              {showPassword ? activeProfile.email.split("@")[0] + "••••••" : "•••••••••••"}
            </div>
            <button
              onClick={() => setShowPassword((v) => !v)}
              className="rounded-xl border border-input bg-secondary p-2.5 text-muted-foreground hover:text-foreground transition-colors"
              title={showPassword ? "Sembunyikan" : "Lihat"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <div className="pt-1">
            {resetSent ? (
              <p className="text-xs text-leaf font-semibold">
                ✅ Email reset password dikirim ke {activeProfile.email}
              </p>
            ) : (
              <button
                onClick={handlePasswordReset}
                disabled={resetLoading || activeProfile.email === "—"}
                className="text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-80 disabled:opacity-40"
              >
                {resetLoading ? "Mengirim..." : "Reset / Ubah Password via Email →"}
              </button>
            )}
          </div>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Tampilan</p>
            <p className="text-xs text-muted-foreground">{isDark ? "Mode Gelap aktif" : "Mode Terang aktif"}</p>
          </div>
          <button
            onClick={handleThemeToggle}
            disabled={themeLoading}
            className={`relative flex h-8 w-14 items-center rounded-full transition-colors duration-300 ${
              isDark ? "bg-primary" : "bg-secondary"
            } border border-border/60 disabled:opacity-60`}
          >
            <span
              className={`absolute flex size-6 items-center justify-center rounded-full bg-card shadow-soft transition-all duration-300 ${
                isDark ? "left-7" : "left-1"
              }`}
            >
              {isDark ? <Moon className="size-3.5 text-primary" /> : <Sun className="size-3.5 text-sun" />}
            </span>
          </button>
        </div>
      </div>

      {/* ── Sosial Media ── */}
      <div className="mt-4 rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Globe className="size-4 text-sky-deep" /> Sosial Media
          </h3>
          {!editingSocial ? (
            <button
              onClick={startEditSocial}
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70"
            >
              <Pencil className="size-3.5" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveSocial}
                disabled={savingSocial}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Check className="size-3.5" /> {savingSocial ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => setEditingSocial(false)}
                className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/70"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {(Object.keys(PLATFORMS) as SocialPlatform[]).map((platform) => {
            const meta = PLATFORMS[platform];
            const Icon = meta.icon;
            const link = getLinkForPlatform(platform);

            if (!editingSocial) {
              // View mode
              if (!link || !link.value.trim()) return null;
              return (
                <div key={platform} className="flex items-center gap-3">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{link.value}</p>
                    <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                  </div>
                  {/* Visibility badge */}
                  {(() => {
                    const vis = VISIBILITY_OPTS.find((v) => v.value === link.visibility);
                    const VisIcon = vis?.icon ?? Globe;
                    return (
                      <span className="flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        <VisIcon className="size-3" /> {vis?.label}
                      </span>
                    );
                  })()}
                </div>
              );
            }

            // Edit mode
            return (
              <div key={platform} className="rounded-2xl border border-border/60 bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">{meta.label}</span>
                </div>
                <input
                  value={link?.value ?? ""}
                  onChange={(e) => setLinkValue(platform, e.target.value)}
                  placeholder={meta.placeholder}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                {/* Visibility selector */}
                <div className="flex gap-1.5">
                  {VISIBILITY_OPTS.map((opt) => {
                    const VIcon = opt.icon;
                    const active = (link?.visibility ?? "public") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setLinkVisibility(platform, opt.value)}
                        className={`flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-colors border ${
                          active
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "bg-secondary border-border/50 text-muted-foreground hover:bg-secondary/70"
                        }`}
                      >
                        <VIcon className="size-3" /> {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!editingSocial && (activeProfile.socialLinks ?? []).filter((l) => l.value.trim()).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Belum ada sosial media. Klik <strong>Edit</strong> untuk menambahkan.
            </p>
          )}
        </div>
      </div>

      {/* ── Progress Pohon ── */}
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

        {/* Stage path */}
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

      {/* ── Admin Panel (jika admin) ── */}
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
            onClick={() => navigate({ to: "/admin" })}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft transition-all hover:opacity-90"
          >
            Buka Panel Moderasi Admin ↗
          </button>
        </div>
      )}

      {/* ── Sesi & Logout ── */}
      <div className="mt-4 rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
        <p className="text-sm font-bold text-foreground">Sesi Pengguna</p>
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

      {/* ── Zona Bahaya ── */}
      <div className="mt-4 rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-destructive">
          <AlertTriangle className="size-4" /> Zona Bahaya
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Menghapus akun akan menghapus <strong>semua data kamu secara permanen</strong> dan tidak dapat dipulihkan.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-destructive/40 bg-card px-4 py-2.5 text-sm font-bold text-destructive transition-all hover:bg-destructive/10 active:scale-95"
        >
          <Trash2 className="size-4" /> Hapus Akun Saya
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          userEmail={activeProfile.email}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </PageShell>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-secondary/30 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
