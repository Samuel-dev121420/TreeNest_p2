import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LogOut,
  Sparkles,
  Pencil,
  Check,
  X,
  Sprout,
  ShieldCheck,
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
  Mail,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import { useAuth } from "@/lib/auth-context";
import { seedProfile } from "@/lib/social";
import type { SocialLink, SocialPlatform, VisibilityLevel } from "@/lib/social";
import { stageForLevel, expNeeded, TREEHOUSE_LEVEL, TREE_STAGES } from "@/lib/treenest";
import { updateUserProfile, getUserFriends } from "@/lib/firestore-service";

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
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.79 1.52V6.7a4.85 4.85 0 01-1.02-.01z" />
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
  { value: "private", label: "Privat", icon: Lock },
  { value: "friends_only", label: "Teman", icon: UserCheck },
  { value: "public", label: "Publik", icon: Globe },
];

// ─── CHANGE PASSWORD MODAL ───────────────────────────────────────────────────

function ChangePasswordModal({
  email,
  onClose,
  onSendReset,
}: {
  email: string;
  onClose: () => void;
  onSendReset: () => Promise<{ success: boolean; error?: string }>;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSend() {
    setErrorMsg("");
    setLoading(true);
    const res = await onSendReset();
    setLoading(false);
    if (res.success) {
      setSent(true);
    } else {
      setErrorMsg(res.error || "Gagal mengirim email reset. Pastikan email terdaftar di Firebase.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-float animate-in zoom-in-95 duration-200">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary mx-auto">
          <KeyRound className="size-6" />
        </div>

        <h2 className="mt-4 text-center text-lg font-bold text-foreground">Ubah Kata Sandi</h2>

        {sent ? (
          <div className="mt-3 text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-leaf bg-leaf/10 p-3 rounded-2xl">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Tautan reset password berhasil dikirim!</span>
            </div>
            <p className="font-bold text-xs text-foreground break-all">{email}</p>
            <div className="rounded-xl bg-secondary/50 p-2.5 text-left text-[11px] text-muted-foreground space-y-1">
              <p className="font-bold text-foreground">📌 Tips Pemeriksaan:</p>
              <p>• Periksa folder <strong>Kotak Masuk (Inbox)</strong>.</p>
              <p>• Jika belum muncul, periksa folder <strong>Spam / Promosi / Sampah</strong>.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-2xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Selesai
            </button>
          </div>
        ) : (
          <div className="mt-3 text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              Tautan instruksi untuk membuat kata sandi baru akan dikirimkan ke alamat email terdaftar:
            </p>
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-secondary/50 p-2.5 text-xs font-bold text-foreground">
              <Mail className="size-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{email}</span>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-destructive/15 p-2.5 text-xs font-semibold text-destructive text-left">
                {errorMsg}
              </div>
            )}

            <div className="mt-6 flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-border/70 bg-secondary py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading || email === "—"}
                onClick={handleSend}
                className="flex-1 rounded-2xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Mengirim..." : "Kirim Email Reset"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl border-2 border-destructive/50 bg-card p-6 shadow-float animate-in zoom-in-95 duration-200">
        {step === "warning" && (
          <>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/15 mx-auto text-destructive ring-4 ring-destructive/10">
              <AlertTriangle className="size-7" />
            </div>
            <h2 className="mt-4 text-center text-lg font-black text-destructive tracking-tight">
              HAPUS AKUN PERMANEN?
            </h2>
            <p className="mt-2 text-center text-xs text-muted-foreground leading-relaxed">
              Tindakan ini <strong className="text-destructive font-bold">TIDAK DAPAT DIBATALKAN</strong>. Seluruh progres pohon, daftar teman, catatan, dan data EXP kamu akan <strong className="text-destructive">dihapus selamanya</strong>.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-border/70 bg-secondary py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70"
              >
                Batal
              </button>
              <button
                type="button"
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
            <h2 className="text-base font-bold text-foreground">Konfirmasi Kalimat</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Ketik persis kalimat berikut untuk mengonfirmasi:
            </p>
            <div className="mt-2 rounded-xl bg-destructive/10 border border-destructive/30 p-2 text-center">
              <code className="font-mono text-xs font-black text-destructive select-all">
                {CONFIRM_PHRASE}
              </code>
            </div>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="mt-3 w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2.5 font-mono text-xs outline-none focus:ring-2 focus:ring-destructive/50"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStep("warning")}
                className="flex-1 rounded-2xl border border-border/70 bg-secondary py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70"
              >
                Kembali
              </button>
              <button
                type="button"
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
            <h2 className="text-base font-bold text-foreground">Verifikasi Alamat Email</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Ketik alamat email akun kamu untuk eksekusi terakhir:
            </p>
            <p className="mt-1 font-mono text-xs font-bold text-foreground break-all">{userEmail}</p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Masukkan email akun"
              className="mt-3 w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-destructive/50"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStep("phrase")}
                className="flex-1 rounded-2xl border border-border/70 bg-secondary py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70"
              >
                Kembali
              </button>
              <button
                type="button"
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

  // Real Accepted Friends Count
  const [realFriendCount, setRealFriendCount] = useState<number>(activeProfile.friendCount || 0);

  useEffect(() => {
    const activeUid = authProfile?.uid;
    if (activeUid) {
      getUserFriends(activeUid, activeProfile.accountId).then((list) => {
        setRealFriendCount(list.length);
      });
    }
  }, [authProfile?.uid, activeProfile?.accountId]);

  // Avatar & Cropper
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSelfFullAvatar, setShowSelfFullAvatar] = useState(false);

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

  // ─── Handlers ──────────────────────────────────────────────────────────────

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
    await updateUserProfile(authProfile.uid, { username, bio, accountId: authProfile.accountId });
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  }

  function cancelEdit() {
    setDraftUsername(activeProfile.username);
    setDraftBio(activeProfile.bio ?? "");
    setEditing(false);
  }

  // Handle file picker selection -> opens Cropper modal instantly (0ms lag)
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (rawImageSrc && rawImageSrc.startsWith("blob:")) {
      URL.revokeObjectURL(rawImageSrc);
    }
    const objectUrl = URL.createObjectURL(file);
    setRawImageSrc(objectUrl);
    setShowCropper(true);

    // Reset input agar bisa pilih file yang sama jika diinginkan
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // When crop is confirmed in ImageCropperModal
  async function handleCropComplete(croppedDataUrl: string) {
    setShowCropper(false);
    if (rawImageSrc && rawImageSrc.startsWith("blob:")) {
      URL.revokeObjectURL(rawImageSrc);
    }
    setRawImageSrc(null);
    if (!authProfile?.uid) return;

    await updateUserProfile(authProfile.uid, { avatarUrl: croppedDataUrl, accountId: authProfile.accountId });
    await refreshProfile();
  }

  // Reset profile picture to default (remove custom image)
  async function handleResetAvatarToDefault() {
    if (!authProfile?.uid) return;
    await updateUserProfile(authProfile.uid, { avatarUrl: "", accountId: authProfile.accountId });
    await refreshProfile();
  }

  async function handleSendPasswordReset(): Promise<{ success: boolean; error?: string }> {
    if (!activeProfile.email || activeProfile.email === "—") {
      return { success: false, error: "Alamat email tidak valid." };
    }
    return await sendPasswordReset(activeProfile.email);
  }

  async function handleThemeToggle() {
    if (!authProfile?.uid) return;
    setThemeLoading(true);
    const newTheme: "light" | "dark" = isDark ? "light" : "dark";
    localStorage.setItem("treenest_theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    await updateUserProfile(authProfile.uid, { themePreference: newTheme });
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
        return prev.map((l) => (l.platform === platform ? { ...l, value } : l));
      }
      return [...prev, { platform, value, visibility: "private" }];
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell title="Account" description="Informasi dan Pengaturan Profil TreeNest Kamu.">
      {/* ── Kartu Profil Utama ── */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft hover:shadow-float transition-all duration-300">
        <div className="h-20 bg-gradient-leaf" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            {/* Avatar container */}
            <div className="relative inline-flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (editing) {
                      fileInputRef.current?.click();
                    } else {
                      setShowSelfFullAvatar(true);
                    }
                  }}
                  className="relative group rounded-full overflow-hidden focus:outline-none focus:ring-4 focus:ring-primary/30 transition-transform hover:scale-105 active:scale-95"
                  title={editing ? "Klik untuk ganti & sesuaikan foto profil" : "Klik untuk melihat foto profil"}
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
                  {/* Hover camera badge overlay */}
                  <span className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-xs">
                    <Camera className="size-5 text-white" />
                    <span className="text-[9px] font-bold text-white mt-0.5">
                      {editing ? "Ubah" : "Lihat"}
                    </span>
                  </span>
                </button>

                {/* Pencil badge overlay when in Edit Profile status */}
                {editing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Ganti foto profil"
                    className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-card hover:scale-110 active:scale-95 transition-transform"
                  >
                    <Pencil className="size-3" />
                  </button>
                )}
              </div>

              {/* Reset to Default Avatar Button when editing */}
              {editing && activeProfile.avatarUrl && (
                <button
                  type="button"
                  onClick={handleResetAvatarToDefault}
                  title="Reset foto profil ke default (inisial)"
                  className="self-end mb-1 flex items-center gap-1.5 rounded-xl border border-border/70 bg-secondary/80 px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset Foto</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {!editing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary/70 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Pencil className="size-3.5" /> Edit Profil
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <Check className="size-3.5" /> {saving ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  onClick={cancelEdit}
                  aria-label="Batal edit"
                  className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary/70 active:scale-95 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="mt-4 space-y-3">
              <Field label={`Username (${draftUsername.length}/30)`}>
                <input
                  value={draftUsername}
                  maxLength={30}
                  onChange={(e) => setDraftUsername(e.target.value.slice(0, 30))}
                  placeholder="Ketik Username..."
                  className="w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring font-medium"
                />
              </Field>
              <Field label={`Bio (${draftBio.length}/150)`}>
                <textarea
                  value={draftBio}
                  maxLength={150}
                  onChange={(e) => setDraftBio(e.target.value.slice(0, 150))}
                  rows={2}
                  placeholder="Ketik Bio singkat..."
                  className="w-full resize-none rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring font-medium"
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
              <p className="text-xs font-medium text-muted-foreground">ID {activeProfile.accountId}</p>
              {activeProfile.bio ? (
                <p className="mt-2 text-sm text-muted-foreground">{activeProfile.bio}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── Info Akun ── */}
      <div className="mt-4 rounded-3xl border border-border/80 bg-card p-5 shadow-soft hover:shadow-float hover:border-primary/40 transition-all duration-300 space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-4 text-sun" /> Informasi Akun & Keamanan
        </h3>

        {/* Email */}
        <InfoRow label="Email" value={activeProfile.email} />

        {/* Total Login Harian */}
        <InfoRow
          label="Total Login Harian"
          value={`${activeProfile.totalLogins ?? 1} Hari`}
          icon={<LogIn className="size-3.5 text-sky-deep" />}
        />

        {/* Jumlah Teman */}
        <InfoRow label="Jumlah Teman" value={`${realFriendCount} Teman`} />

        {/* Password Management */}
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <KeyRound className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Kata Sandi</p>
              <p className="text-xs text-muted-foreground">Tersimpan aman & terenkripsi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
          >
            <KeyRound className="size-3.5 text-primary" /> Ubah Password
          </button>
        </div>

        {/* Theme Preference */}
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-foreground">Tampilan Tema</p>
            <p className="text-xs text-muted-foreground">{isDark ? "Mode Gelap aktif" : "Mode Terang aktif"}</p>
          </div>
          <button
            type="button"
            onClick={handleThemeToggle}
            disabled={themeLoading}
            className={`relative flex h-8 w-14 items-center rounded-full transition-colors duration-300 ${
              isDark ? "bg-primary" : "bg-secondary"
            } border border-border/70 disabled:opacity-60 cursor-pointer`}
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
      <div className="mt-4 rounded-3xl border border-border/80 bg-card p-5 shadow-soft hover:shadow-float hover:border-primary/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Globe className="size-4 text-sky-deep" /> Sosial Media
          </h3>
          {!editingSocial ? (
            <button
              onClick={startEditSocial}
              className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary/70 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Pencil className="size-3.5" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveSocial}
                disabled={savingSocial}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <Check className="size-3.5" /> {savingSocial ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => setEditingSocial(false)}
                className="rounded-xl border border-border/60 bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/70 active:scale-95 cursor-pointer"
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
                    <p className="text-sm font-bold text-foreground truncate">{link.value}</p>
                    <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                  </div>
                  {/* Visibility badge */}
                  {(() => {
                    const vis = VISIBILITY_OPTS.find((v) => v.value === link.visibility);
                    const VisIcon = vis?.icon ?? Globe;
                    return (
                      <span className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/50 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
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
                  className="w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                />
                {/* Visibility selector */}
                <div className="flex gap-1.5">
                  {VISIBILITY_OPTS.map((opt) => {
                    const VIcon = opt.icon;
                    const active = (link?.visibility ?? "private") === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setLinkVisibility(platform, opt.value)}
                        className={`flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-all cursor-pointer border ${
                          active
                            ? "bg-primary/15 border-primary/50 text-primary shadow-xs"
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
            <p className="text-xs text-muted-foreground text-center py-3">
              Belum ada sosial media yang ditambahkan.
            </p>
          )}
        </div>
      </div>

      {/* ── Progress Pohon ── */}
      <div className="mt-4 rounded-3xl border border-border/80 bg-card p-5 shadow-soft hover:shadow-float hover:border-leaf/50 transition-all duration-300">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Sprout className="size-4 text-leaf" /> Pertumbuhan Pohon
          </h3>
          <span className="rounded-full bg-leaf/15 px-2.5 py-1 text-xs font-bold text-leaf">
            Lv {activeProfile.level}
          </span>
        </div>
        <p className="mt-3 text-sm font-bold text-foreground">{stage.label}</p>
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
                  className={`flex size-9 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                    current
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110 shadow-soft"
                      : reached
                        ? "bg-leaf/15 text-leaf hover:scale-105"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-[9px] leading-tight ${reached ? "text-foreground font-bold" : "text-muted-foreground"}`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mode Admin (Bold Visual Styling) ── */}
      {authProfile?.role === "admin" && (
        <div className="mt-6 rounded-3xl border-2 border-primary/60 bg-primary/15 p-6 shadow-soft hover:shadow-float transition-all duration-300">
          <div className="flex items-center gap-2 text-primary font-black tracking-wide uppercase text-sm">
            <ShieldCheck className="size-5 shrink-0" />
            <span>Mode Admin (Admin Access & Moderasi)</span>
          </div>
          <p className="mt-2 text-xs font-medium text-foreground/90 leading-relaxed">
            Akun ini memiliki hak istimewa <strong>Administrator TreeNest</strong>. Anda dapat mengelola, meninjau, menyetujui, atau menolak video TreeGallery yang diunggah oleh seluruh pengguna.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/admin" })}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="size-4" /> Buka Panel Moderasi Admin ↗
          </button>
        </div>
      )}

      {/* ── Sesi & Logout ── */}
      <div className="mt-4 rounded-3xl border border-border/80 bg-card p-5 shadow-soft hover:shadow-float hover:border-primary/30 transition-all duration-300">
        <p className="text-sm font-bold text-foreground">Sesi Pengguna</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Akun kamu tersambung dengan sistem autentikasi TreeNest.
        </p>
        <button
          onClick={handleLogout}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-secondary px-5 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-destructive/15 hover:text-destructive hover:border-destructive/30 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <LogOut className="size-4" /> Logout dari Akun
        </button>
      </div>

      {/* ── Zona Bahaya (Bold Visual Styling) ── */}
      <div className="mt-6 rounded-3xl border-2 border-destructive/40 bg-destructive/10 p-6 shadow-soft hover:shadow-float hover:border-destructive/60 transition-all duration-300">
        <div className="flex items-center gap-2 text-destructive font-black tracking-wide uppercase text-sm">
          <AlertTriangle className="size-5 shrink-0" />
          <span>Zona Bahaya (Danger Zone)</span>
        </div>
        <p className="mt-2 text-xs font-medium text-destructive/90 leading-relaxed">
          Menghapus akun akan menghapus <strong>seluruh data kamu secara permanen</strong> dari server TreeNest dan tidak dapat dipulihkan kembali.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-destructive px-5 py-2.5 text-sm font-bold text-destructive-foreground shadow-soft transition-all hover:bg-destructive/90 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Trash2 className="size-4" /> Hapus Akun Saya
        </button>
      </div>

      {/* Modal Cropper Foto Profil */}
      {showCropper && rawImageSrc && (
        <ImageCropperModal
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            if (rawImageSrc && rawImageSrc.startsWith("blob:")) {
              URL.revokeObjectURL(rawImageSrc);
            }
            setRawImageSrc(null);
          }}
        />
      )}

      {/* Modal Ubah Password */}
      {showPasswordModal && (
        <ChangePasswordModal
          email={activeProfile.email}
          onClose={() => setShowPasswordModal(false)}
          onSendReset={handleSendPasswordReset}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          userEmail={activeProfile.email}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}

      {/* ── MODAL FOTO PROFIL UKURAN BESAR (FULL-SIZE AVATAR LIGHTBOX) ── */}
      {showSelfFullAvatar && (
        <div
          onClick={() => setShowSelfFullAvatar(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm sm:max-w-md w-full flex flex-col items-center gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-float text-center animate-in zoom-in-95 duration-150"
          >
            <button
              onClick={() => setShowSelfFullAvatar(false)}
              className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 cursor-pointer transition-colors"
            >
              <X className="size-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-foreground">Foto Profil - {activeProfile.username}</h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                (ID: {activeProfile.accountId})
              </p>
            </div>

            <div className="relative flex items-center justify-center p-4">
              {activeProfile.avatarUrl ? (
                <img
                  src={activeProfile.avatarUrl}
                  alt={activeProfile.username}
                  className="size-64 sm:size-72 rounded-full object-cover ring-2 ring-black/80 dark:ring-white/80 shadow-[0_0_32px_8px_rgba(var(--primary-rgb,74,222,128),0.35)] dark:shadow-[0_0_36px_10px_rgba(var(--primary-rgb,74,222,128),0.45)]"
                />
              ) : (
                <span
                  className="flex size-64 sm:size-72 items-center justify-center rounded-full text-6xl font-extrabold text-primary-foreground ring-2 ring-black/80 dark:ring-white/80 shadow-[0_0_32px_8px_rgba(var(--primary-rgb,74,222,128),0.35)] dark:shadow-[0_0_36px_10px_rgba(var(--primary-rgb,74,222,128),0.45)]"
                  style={{
                    backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${activeProfile.hue}), oklch(0.66 0.13 ${activeProfile.hue + 25}))`,
                  }}
                >
                  {activeProfile.initials}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowSelfFullAvatar(false)}
              className="w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer shadow-soft"
            >
              Kembali
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
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
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
