import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  LogOut,
  Pencil,
  Check,
  X,
  Sprout,
  ShieldCheck,
  ArrowUpRight,
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
  Film,
  Users,
  TreePine,
  Sparkles,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";
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
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.79 1.52V6.7a4.85 4.85 0 01-1.02-.01z" />
      </svg>
    ),
  },
  whatsapp: {
    label: "WhatsApp",
    placeholder: "+62 123-456-7890",
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
  useScrollLock(true);
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-float animate-in zoom-in-95 duration-150">
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
              <p className="font-bold text-foreground">Tips Pemeriksaan:</p>
              <p>• Periksa folder <strong>Kotak Masuk (Inbox)</strong>.</p>
              <p>• Jika belum muncul, periksa folder <strong>Spam / Promosi / Sampah</strong>.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-2xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
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
                className="flex-1 rounded-2xl border border-border/70 bg-secondary py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading || email === "—"}
                onClick={handleSend}
                className="flex-1 rounded-2xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
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
  useScrollLock(true);
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl border border-destructive/40 bg-card p-6 shadow-float animate-in zoom-in-95 duration-150">
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
                className="flex-1 rounded-2xl border border-border/70 bg-secondary py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setStep("phrase")}
                className="flex-1 rounded-2xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
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
                className="flex-1 rounded-2xl border border-border/70 bg-secondary py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={phrase !== CONFIRM_PHRASE}
                onClick={() => setStep("email")}
                className="flex-1 rounded-2xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 transition-colors cursor-pointer"
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
                className="flex-1 rounded-2xl border border-border/70 bg-secondary py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={emailInput.trim().toLowerCase() !== userEmail.trim().toLowerCase() || deleting}
                onClick={handleDelete}
                className="flex-1 rounded-2xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 transition-colors cursor-pointer"
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
  const [themeLoading, setThemeLoading] = useState(false);
  const isDark =
    activeProfile.themePreference === "dark" ||
    (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
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

  // Treehouse Video Privacy State
  const [privacySetting, setPrivacySetting] = useState<"public" | "friends" | "private">(
    activeProfile.treehouseVideoPrivacy || "public",
  );

  useEffect(() => {
    if (authProfile) {
      if (!editing) {
        setDraftUsername(authProfile.username);
        setDraftBio(authProfile.bio ?? "");
      }
      if (!editingSocial) {
        setDraftLinks(authProfile.socialLinks ?? []);
      }
      if (authProfile.treehouseVideoPrivacy) {
        setPrivacySetting(authProfile.treehouseVideoPrivacy);
      }
    }
  }, [authProfile, editing, editingSocial]);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Scroll Restoration when returning from Admin Panel
  useEffect(() => {
    let r1: number | undefined;
    let t1: NodeJS.Timeout | undefined;
    let t2: NodeJS.Timeout | undefined;
    let t3: NodeJS.Timeout | undefined;
    let t4: NodeJS.Timeout | undefined;

    const restoreScrollStr =
      typeof window !== "undefined" ? sessionStorage.getItem("treenest_restore_scroll") : null;
    if (restoreScrollStr) {
      const targetScroll = Number(restoreScrollStr);
      if (targetScroll > 0) {
        const doScroll = () => {
          window.scrollTo({ top: targetScroll, left: 0, behavior: "instant" });
        };
        doScroll();
        r1 = requestAnimationFrame(doScroll);
        t1 = setTimeout(doScroll, 40);
        t2 = setTimeout(doScroll, 120);
        t3 = setTimeout(doScroll, 250);
        t4 = setTimeout(() => {
          doScroll();
          sessionStorage.removeItem("treenest_restore_scroll");
        }, 450);
      }
    }

    return () => {
      if (r1) cancelAnimationFrame(r1);
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
      if (t4) clearTimeout(t4);
    };
  }, []);

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
      {/* ── 1. KARTU PROFIL UTAMA (DENGAN BANNER HIJAU TREENEST) ── */}
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
                  className="relative group rounded-full overflow-hidden focus:outline-none focus:ring-4 focus:ring-primary/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
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
                    className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-card hover:scale-110 active:scale-95 transition-transform cursor-pointer"
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
                type="button"
                onClick={startEdit}
                className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary px-3.5 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary/70 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              >
                <Pencil className="size-3.5" /> Edit Profil
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <Check className="size-3.5" /> {saving ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  aria-label="Batal edit"
                  className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary/70 active:scale-95 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {editing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mt-4 space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Username
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {draftUsername.length}/30
                    </span>
                  </div>
                  <input
                    value={draftUsername}
                    maxLength={30}
                    onChange={(e) => setDraftUsername(e.target.value.slice(0, 30))}
                    placeholder="Ketik Username..."
                    className="w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Bio Profil
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {draftBio.length}/150
                    </span>
                  </div>
                  <textarea
                    value={draftBio}
                    maxLength={150}
                    onChange={(e) => setDraftBio(e.target.value.slice(0, 150))}
                    rows={2}
                    placeholder="Ketik Bio singkat..."
                    className="w-full resize-none rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="viewing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mt-3"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-foreground">{activeProfile.username}</h2>
                  {authProfile?.role === "admin" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                      <ShieldCheck className="size-3.5" /> Admin
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  ID {activeProfile.accountId}
                </p>
                {activeProfile.bio ? (
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {activeProfile.bio}
                  </p>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 2. INFORMASI AKUN & KEAMANAN ── */}
      <div className="mt-4 rounded-3xl border border-border/80 bg-card p-5 shadow-soft hover:shadow-float transition-all duration-300 space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-4 text-sun" /> Informasi Akun & Keamanan
        </h3>

        {/* Email */}
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Mail className="size-3.5 text-muted-foreground" /> Email
          </p>
          <p className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">{activeProfile.email}</p>
        </div>

        {/* Total Login Harian */}
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <LogIn className="size-3.5 text-sky-500" /> Total Login Harian
          </p>
          <p className="text-sm font-bold text-foreground">{activeProfile.totalLogins ?? 1} Hari</p>
        </div>

        {/* Jumlah Teman */}
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-emerald-500" /> Jumlah Teman
          </p>
          <p className="text-sm font-bold text-foreground">{realFriendCount} Teman</p>
        </div>

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

      {/* ── 3. PENGATURAN PRIVASI VIDEO RUMAH POHON (HANYA LEVEL 20 MAX) ── */}
      {activeProfile.level >= 20 && (
        <div className="mt-4 rounded-3xl border border-amber-500/40 bg-card p-5 shadow-soft hover:shadow-float transition-all duration-300 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Film className="size-4 text-amber-500" /> Privasi Video Rumah Pohon
            </h3>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300">
              LEVEL 20 UNLOCKED
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tentukan siapa saja yang dapat menonton video yang kamu pamerkan di Rumah Pohon saat user lain mengunjungi Home Page kamu.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { value: "private", label: "Privat", desc: "Hanya Kamu", icon: Lock },
              { value: "friends", label: "Teman", desc: "Teman Kamu", icon: UserCheck },
              { value: "public", label: "Publik", desc: "Semua User", icon: Globe },
            ].map((opt) => {
              const Icon = opt.icon;
              const isSelected = privacySetting === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={async () => {
                    const newVal = opt.value as "public" | "friends" | "private";
                    setPrivacySetting(newVal);
                    if (!authProfile?.uid) return;
                    await updateUserProfile(authProfile.uid, { treehouseVideoPrivacy: newVal });
                    await refreshProfile();
                  }}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-2 border-amber-500 bg-amber-500/15 text-foreground font-bold shadow-soft scale-[1.02]"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  }`}
                >
                  <Icon className={`size-4 ${isSelected ? "text-amber-500" : "text-muted-foreground"}`} />
                  <span className="mt-1 text-xs font-bold">{opt.label}</span>
                  <span className="text-[9px] opacity-80">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. SOSIAL MEDIA ── */}
      <div className="mt-4 rounded-3xl border border-border/80 bg-card p-5 shadow-soft hover:shadow-float transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Globe className="size-4 text-sky-deep" /> Sosial Media
          </h3>
          {!editingSocial ? (
            <button
              type="button"
              onClick={startEditSocial}
              className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary/70 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Pencil className="size-3.5" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveSocial}
                disabled={savingSocial}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <Check className="size-3.5" /> {savingSocial ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => setEditingSocial(false)}
                className="rounded-xl border border-border/60 bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/70 active:scale-95 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={editingSocial ? "social-edit" : "social-view"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {(Object.keys(PLATFORMS) as SocialPlatform[]).map((platform) => {
              const meta = PLATFORMS[platform];
              const Icon = meta.icon;
              const link = getLinkForPlatform(platform);

              if (!editingSocial) {
                // View mode
                if (!link || !link.value.trim()) return null;
                return (
                  <motion.div
                    key={platform}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-3"
                  >
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
                  </motion.div>
                );
              }

              // Edit mode
              return (
                <motion.div
                  key={platform}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-2xl border border-border/60 bg-secondary/30 p-3 space-y-2"
                >
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
                        <motion.button
                          type="button"
                          key={opt.value}
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setLinkVisibility(platform, opt.value)}
                          className={`flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-all cursor-pointer border ${
                            active
                              ? "bg-primary/15 border-primary/50 text-primary shadow-xs"
                              : "bg-secondary border-border/50 text-muted-foreground hover:bg-secondary/70"
                          }`}
                        >
                          <VIcon className="size-3" /> {opt.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}

            {!editingSocial && (activeProfile.socialLinks ?? []).filter((l) => l.value.trim()).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Belum ada sosial media yang ditambahkan.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 5. PERTUMBUHAN POHON ── */}
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

      {/* ── 6. MODE ADMIN (KHUSUS ADMIN) ── */}
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
            onClick={() => {
              if (typeof window !== "undefined") {
                const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
                sessionStorage.setItem("treenest_admin_return_path", "/account");
                sessionStorage.setItem("treenest_admin_return_scroll", String(Math.round(currentScroll)));
                navigate({ to: "/admin", search: { from: "/account", scroll: Math.round(currentScroll) } });
              } else {
                navigate({ to: "/admin", search: { from: "/account" } });
              }
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="size-4" /> <span>Buka Panel Moderasi Admin</span> <ArrowUpRight className="size-4" />
          </button>
        </div>
      )}

      {/* ── 7. SESI & LOGOUT ── */}
      <div className="mt-4 rounded-3xl border border-border/80 bg-card p-5 shadow-soft hover:shadow-float transition-all duration-300">
        <p className="text-sm font-bold text-foreground">Sesi Pengguna</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Akun kamu tersambung dengan sistem autentikasi TreeNest.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-secondary px-5 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-secondary/70 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
        >
          <LogOut className="size-4" /> Logout dari Akun
        </button>
      </div>

      {/* ── 8. ZONA BAHAYA (DEDICATED DANGER ZONE CARD) ── */}
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

      {/* Lightbox Foto Profil Ukuran Penuh */}
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
              type="button"
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
                  className="size-64 sm:size-72 rounded-full object-cover ring-4 ring-black dark:ring-white shadow-google-glow transition-all duration-300"
                />
              ) : (
                <span
                  className="flex size-64 sm:size-72 items-center justify-center rounded-full text-6xl font-extrabold text-primary-foreground ring-4 ring-black dark:ring-white shadow-google-glow transition-all duration-300"
                  style={{
                    backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${activeProfile.hue}), oklch(0.66 0.13 ${activeProfile.hue + 25}))`,
                  }}
                >
                  {activeProfile.initials}
                </span>
              )}
            </div>

            <button
              type="button"
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
