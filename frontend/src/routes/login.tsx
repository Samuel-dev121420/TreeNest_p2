import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { type User } from "firebase/auth";
import {
  Leaf,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Check,
  Sun,
  Moon,
} from "lucide-react";
import { searchUserByAccountId } from "@/lib/firestore-service";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk & Daftar — TreeNest" },
      {
        name: "description",
        content:
          "Masuk atau buat akun TreeNest untuk merawat pohonmu, mencatat fokus harian, dan melanjutkan perjalanan bertumbuhmu.",
      },
    ],
  }),
  component: LoginPage,
});

/* ─── Main Page Component ────────────────────────────────────────────── */
function LoginPage() {
  const navigate = useNavigate();
  const {
    login,
    loginWithGoogle,
    signup,
    sendVerificationEmail,
    completeVerification,
    cancelUnverifiedRegistration,
    sendPasswordReset,
  } = useAuth();

  // Dark / Light theme state
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from html element or localStorage
  useEffect(() => {
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    setIsDark(isCurrentlyDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Auth Mode: "login" | "register" | "forgot"
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");

  // Input states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback states
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Email Verification State
  const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Forgot Password specific state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Cooldown timer for email resend
  useEffect(() => {
    let timer: number;
    if (cooldown > 0) {
      timer = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const switchMode = (mode: "login" | "register" | "forgot") => {
    setAuthMode(mode);
    setError("");
    setInfoMsg("");
    if (mode === "forgot") {
      setForgotEmail(email || "");
      setForgotSent(false);
    }
  };

  /* ─── Google Sign-In Handler ────────────────────────────────────────── */
  async function handleGoogleLogin() {
    setError("");
    setInfoMsg("");
    setGoogleLoading(true);

    try {
      const res = await loginWithGoogle();
      if (res.success) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("treenest_admin_return_path");
          sessionStorage.removeItem("treenest_admin_return_scroll");
          sessionStorage.removeItem("treenest_restore_scroll");
        }
        if (res.profile?.role === "admin") {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/" });
        }
      } else if (res.error) {
        setError(res.error);
      }
    } catch {
      setError("Terjadi kesalahan saat masuk dengan Google. Silakan coba lagi.");
    } finally {
      setGoogleLoading(false);
    }
  }

  /* ─── Submit Handler (Login & Register) ────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    const cleanEmail = email.trim();
    const cleanPass = password;

    if (!cleanEmail) {
      setError("Alamat email atau username wajib diisi.");
      return;
    }

    if (authMode === "register") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setError("Format alamat email tidak valid.");
        return;
      }
    }

    if (!cleanPass) {
      setError("Kata sandi wajib diisi.");
      return;
    }

    setLoading(true);

    if (authMode === "register") {
      const cleanUsername = username.trim();
      if (!cleanUsername) {
        setError("Username wajib diisi.");
        setLoading(false);
        return;
      }
      if (cleanUsername.length < 3) {
        setError("Username minimal 3 karakter.");
        setLoading(false);
        return;
      }
      if (cleanPass.length < 6) {
        setError("Kata sandi minimal 6 karakter.");
        setLoading(false);
        return;
      }

      const res = await signup(cleanUsername, cleanEmail, cleanPass);
      setLoading(false);

      if (res.success) {
        if (res.requiresVerification && res.firebaseUser) {
          setPendingVerificationUser(res.firebaseUser);
          setInfoMsg(res.infoMessage || `Tautan verifikasi telah dikirim ke ${cleanEmail}.`);
        } else if (res.profile?.role === "admin") {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/" });
        }
      } else {
        setError(res.error || "Pendaftaran gagal. Silakan periksa kembali data Anda.");
      }
    } else {
      let targetEmail = cleanEmail;
      if (!targetEmail.includes("@")) {
        try {
          const profile = await searchUserByAccountId(targetEmail);
          if (profile?.email) {
            targetEmail = profile.email;
          }
        } catch {
          // ignore lookup error and proceed
        }
      }

      const res = await login(targetEmail, cleanPass);
      setLoading(false);

      if (res.success) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("treenest_admin_return_path");
          sessionStorage.removeItem("treenest_admin_return_scroll");
          sessionStorage.removeItem("treenest_restore_scroll");
        }
        if (res.profile?.role === "admin") {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/" });
        }
      } else {
        setError(
          res.error || "Email atau kata sandi yang kamu masukkan salah. Silakan periksa kembali."
        );
      }
    }
  }

  /* ─── Verification Check ───────────────────────────────────────────── */
  async function handleCheckVerification() {
    if (!pendingVerificationUser) return;
    setError("");
    setInfoMsg("");
    setLoading(true);

    const res = await completeVerification(pendingVerificationUser, username.trim());
    setLoading(false);

    if (res.success) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("treenest_admin_return_path");
        sessionStorage.removeItem("treenest_admin_return_scroll");
        sessionStorage.removeItem("treenest_restore_scroll");
      }
      if (res.profile?.role === "admin") {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/" });
      }
    } else {
      setError(res.error || "Email belum terverifikasi. Silakan klik tautan di email Anda.");
    }
  }

  /* ─── Resend Verification Email ────────────────────────────────────── */
  async function handleResendEmail() {
    if (!pendingVerificationUser || cooldown > 0) return;
    setError("");
    setInfoMsg("");
    const ok = await sendVerificationEmail(pendingVerificationUser);
    if (ok) {
      setInfoMsg(`Email verifikasi baru telah dikirim ke ${email.trim()}.`);
      setCooldown(30);
    } else {
      setError("Gagal mengirim ulang email. Harap tunggu beberapa saat.");
    }
  }

  /* ─── Forgot Password Handler ──────────────────────────────────────── */
  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setError("Masukkan alamat email terdaftar kamu.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Format alamat email tidak valid.");
      return;
    }

    setLoading(true);
    const res = await sendPasswordReset(cleanEmail);
    setLoading(false);

    if (res.success) {
      setForgotSent(true);
    } else {
      setError(res.error || "Gagal mengirim email reset. Pastikan email terdaftar.");
    }
  }

  return (
    <div className="treenest-theme-transition relative h-screen w-full overflow-hidden bg-gradient-soft text-foreground font-sans flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Global Smooth CSS Theme Transition */}
      <style>{`
        .treenest-theme-transition,
        .treenest-theme-transition .theme-smooth {
          transition: background-color 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                      color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      {/* ── 1. Elemen Pojok Tepi Atas ── */}
      {/* Pojok Kiri Atas: Teks TreeNest Dua Warna Profesional (Kaku & Berkarakter) */}
      <div className="fixed top-4 left-4 sm:top-6 sm:left-7 z-20 select-none">
        <span className="text-2xl sm:text-[30px] font-extrabold font-mono tracking-wider leading-none">
          <span className="text-emerald-800 dark:text-emerald-400">Tree</span><span className="text-foreground">Nest</span>
        </span>
      </div>

      {/* Pojok Kanan Atas: Slogan & Leaf Icon */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-7 z-20 flex items-center gap-2 select-none">
        <span className="text-xs sm:text-[13px] font-medium text-muted-foreground tracking-tight hidden sm:inline">
          Bersama tumbuh, lebih baik.
        </span>
      </div>

      {/* ── 2. Kartu Utama di Tengah Layar (Sudut Lebih Tajam & Tombol Ganti Tema di Samping Kanan Tengah) ── */}
      <div className="flex-1 w-full flex items-center justify-center z-10 py-2">
        <div className="relative w-full max-w-[460px] flex items-center justify-center">
          {/* Balok/Kartu Utama (Sudut Lekukan Tipis: rounded-md) */}
          <div
            className="theme-smooth w-full rounded-md bg-card border border-border/80 shadow-soft p-7 sm:p-9 sm:py-9 text-card-foreground relative transition-shadow duration-200"
          >
            {/* Animated Container for Smooth Mode Switching (Forgot / Verify / Main Form) */}
            <AnimatePresence mode="wait" initial={false}>
              {pendingVerificationUser ? (
                /* ─── State 1: Email Verification Screen ─── */
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <div className="text-center space-y-2">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                      <Mail className="size-6 stroke-[2]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold font-display text-foreground tracking-tight">
                        Verifikasi Alamat Email
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Tautan konfirmasi telah dikirimkan ke:
                      </p>
                      <p className="mt-1 text-xs sm:text-sm font-semibold text-primary break-all bg-muted/60 py-1 px-3 rounded-lg border border-border inline-block">
                        {email}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs space-y-1.5 text-muted-foreground">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-primary" /> Langkah Penyelesaian:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] sm:text-xs leading-relaxed">
                      <li>Buka kotak masuk email kamu (cek folder <strong>Spam</strong> jika perlu).</li>
                      <li>Klik tautan <strong>Verifikasi Email</strong> dari TreeNest.</li>
                      <li>Setelah klik tautan, tekan tombol konfirmasi di bawah.</li>
                    </ol>
                  </div>

                  {/* Feedback Alerts */}
                  {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {infoMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>{infoMsg}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCheckVerification}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white py-2.5 px-4 text-xs sm:text-sm font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4 stroke-[2.5]" />
                      )}
                      <span>{loading ? "Memeriksa Status..." : "Saya Sudah Verifikasi"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={cooldown > 0}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/50 py-2 px-4 text-xs font-medium text-muted-foreground transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <span>{cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : "Kirim Ulang Tautan Verifikasi"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        await cancelUnverifiedRegistration(pendingVerificationUser);
                        setPendingVerificationUser(null);
                        setError("");
                        setInfoMsg("");
                        switchMode("register");
                        setLoading(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl hover:bg-destructive/10 py-1.5 px-4 text-xs font-medium text-destructive transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Ganti Email / Batal Registrasi</span>
                    </button>
                  </div>
                </motion.div>
              ) : authMode === "forgot" ? (
                /* ─── State 2: Forgot Password Screen ─── */
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
                      Pemulihan Kata Sandi
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Masukkan email terdaftar kamu untuk menerima tautan reset kata sandi.
                    </p>
                  </div>

                  {forgotSent ? (
                    <div className="space-y-3.5 text-center py-2">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                        <Check className="size-6 stroke-[2.5]" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-foreground">
                          Tautan Reset Telah Dikirim!
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Kami telah mengirimkan instruksi pemulihan ke:
                        </p>
                        <p className="text-xs font-semibold text-primary break-all bg-muted/60 py-1 px-3 rounded-lg border border-border inline-block mt-1">
                          {forgotEmail}
                        </p>
                      </div>

                      <div className="rounded-xl bg-muted/40 p-3 text-left text-[11px] sm:text-xs text-muted-foreground space-y-1 border border-border">
                        <p className="font-semibold text-foreground">Tips Pemeriksaan:</p>
                        <p>• Buka aplikasi email kamu dan cari pesan dari TreeNest.</p>
                        <p>• Jika belum ada dalam beberapa menit, periksa folder <strong>Spam</strong>.</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => switchMode("login")}
                        className="w-full rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-sm"
                      >
                        Kembali ke Halaman Masuk
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                      {error && (
                        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
                          <AlertCircle className="size-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-foreground">
                          Email Terdaftar
                        </label>
                        <div className="theme-smooth relative rounded-xl border border-border/80 bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-secondary/50 dark:text-foreground dark:placeholder:text-muted-foreground dark:border-white/10 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-primary/40 transition-all duration-200">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                            <Mail className="size-4 text-muted-foreground" />
                          </span>
                          <input
                            type="email"
                            required
                            placeholder="Email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="w-full bg-transparent py-2.5 sm:py-3 pl-10 pr-4 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => switchMode("login")}
                          className="flex-1 rounded-xl border border-border bg-card hover:bg-muted/50 py-2.5 text-xs font-semibold text-muted-foreground transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white py-2.5 text-xs sm:text-sm font-semibold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          {loading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <span>Kirim Tautan</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              ) : (
                /* ─── State 3: Primary Login / Register Form (Fluid Morphing Experience) ─── */
                <motion.div
                  key="main-form"
                  initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Form Title & Supporting Text with Fluid Morphing */}
                  <div className="mb-5 space-y-1 text-center">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.h2
                        key={authMode}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="text-2xl sm:text-[26px] font-bold font-display text-foreground tracking-tight"
                      >
                        {authMode === "register" ? "Daftar TreeNest" : "Login TreeNest"}
                      </motion.h2>
                    </AnimatePresence>

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={authMode}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: 0.05 }}
                        className="text-xs sm:text-sm text-muted-foreground"
                      >
                        {authMode === "register"
                          ? "Lengkapi formulir di bawah untuk membuat akun baru."
                          : "Silahkan mengisi formulir dibawah untuk login."}
                      </motion.p>
                    </AnimatePresence>
                  </div>

                  {/* Error Banner */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3.5 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive"
                    >
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {/* Form Fields */}
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Username (Register Only — Smooth Height & Fade Morph) */}
                    <AnimatePresence initial={false}>
                      {authMode === "register" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                          animate={{ opacity: 1, height: "auto", marginBottom: 14 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{
                            height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                            opacity: { duration: 0.22, delay: 0.04 },
                          }}
                          className="overflow-hidden space-y-1"
                        >
                          <label className="block text-xs font-semibold text-foreground">
                            Username
                          </label>
                          <div className="theme-smooth relative rounded-xl border border-border/80 bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-secondary/50 dark:text-foreground dark:placeholder:text-muted-foreground dark:border-white/10 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-primary/40 transition-all duration-200">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                              <UserIcon className="size-4 text-muted-foreground" />
                            </span>
                            <input
                              type="text"
                              required={authMode === "register"}
                              placeholder="Username"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="w-full bg-transparent py-2.5 sm:py-3 pl-10 pr-4 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email atau Username */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-foreground">
                        {authMode === "register" ? "Email" : "Email"}
                      </label>
                      <div className="theme-smooth relative rounded-xl border border-border/80 bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-secondary/50 dark:text-foreground dark:placeholder:text-muted-foreground dark:border-white/10 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-primary/40 transition-all duration-200">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                          <Mail className="size-4 text-muted-foreground" />
                        </span>
                        <input
                          type="text"
                          required
                          placeholder={authMode === "register" ? "Email" : "Email"}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent py-2.5 sm:py-3 pl-10 pr-4 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-foreground">
                          Password
                        </label>
                        <AnimatePresence>
                          {authMode === "login" && (
                            <motion.button
                              initial={{ opacity: 0, x: 4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 4 }}
                              transition={{ duration: 0.18 }}
                              type="button"
                              onClick={() => switchMode("forgot")}
                              className="text-xs font-semibold text-primary hover:underline transition-colors cursor-pointer focus:outline-none"
                            >
                              Lupa Password?
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="theme-smooth relative rounded-xl border border-border/80 bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-secondary/50 dark:text-foreground dark:placeholder:text-muted-foreground dark:border-white/10 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-primary/40 transition-all duration-200">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                          <Lock className="size-4 text-muted-foreground" />
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent py-2.5 sm:py-3 pl-10 pr-10 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                          aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Primary Submit Button: Instant Clean White Text with Fixed Height */}
                    <button
                      type="submit"
                      disabled={loading || googleLoading}
                      className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold px-4 text-xs sm:text-sm shadow-sm hover:shadow transition-[background-color,transform,box-shadow] duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.985] mt-2 select-none"
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin text-white" />
                      ) : (
                        <div className="flex items-center gap-1.5 text-white">
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={authMode}
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -3 }}
                              transition={{ duration: 0.16 }}
                              className="text-white"
                            >
                              {authMode === "register" ? "Daftar" : "Masuk"}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      )}
                    </button>

                    {/* Google OAuth Sign-In / Sign-Up Button (Tepat di bawah tombol Masuk / Daftar) */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading || googleLoading}
                      className="theme-smooth w-full h-11 flex items-center justify-center gap-2.5 rounded-xl border border-border/80 bg-white hover:bg-neutral-50 dark:bg-secondary/40 dark:hover:bg-secondary/70 dark:border-white/10 text-foreground text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs active:scale-[0.985] select-none"
                    >
                      {googleLoading ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <svg className="size-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>
                            {authMode === "register" ? "Daftar dengan Google" : "Masuk dengan Google"}
                          </span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Registration / Login Prompt with Fluid Switch */}
                  <div className="mt-4 sm:mt-5 text-center text-xs text-muted-foreground">
                    <AnimatePresence mode="wait" initial={false}>
                      {authMode === "login" ? (
                        <motion.div
                          key="login-prompt"
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.16 }}
                          className="flex items-center justify-center gap-1.5 flex-wrap"
                        >
                          <span>Belum punya akun?</span>
                          <button
                            type="button"
                            onClick={() => switchMode("register")}
                            className="font-semibold text-primary hover:underline transition-colors inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Daftar sekarang</span>
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="register-prompt"
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.16 }}
                          className="flex items-center justify-center gap-1.5 flex-wrap"
                        >
                          <span>Sudah punya akun?</span>
                          <button
                            type="button"
                            onClick={() => switchMode("login")}
                            className="font-semibold text-primary hover:underline transition-colors inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Masuk sekarang</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Tombol Ganti Mode Terang/Gelap di Samping Kanan Tengah Balok/Kartu Utama ── */}
          <div className="absolute -right-3.5 sm:left-[calc(100%+14px)] sm:right-auto top-1/2 -translate-y-1/2 z-30 flex select-none">
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Beralih ke Mode Terang (Siang)" : "Beralih ke Mode Gelap (Malam)"}
              aria-label={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
              className="theme-smooth flex items-center justify-center size-9 sm:size-10 rounded-xl sm:rounded-2xl border border-border/80 bg-card/95 hover:bg-card text-foreground shadow-soft hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Sun className="size-4 sm:size-[18px] text-amber-400 fill-amber-400/20" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Moon className="size-4 sm:size-[18px] text-slate-700 fill-slate-700/20" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* ── Tombol Kembali di Samping Kiri Tengah Balok/Kartu Utama ── */}
          <AnimatePresence initial={false}>
            {(authMode !== "login" || pendingVerificationUser) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -left-3.5 sm:right-[calc(100%+14px)] sm:left-auto top-1/2 -translate-y-1/2 z-30 flex select-none"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (pendingVerificationUser) {
                      // From verify → back to register
                      cancelUnverifiedRegistration(pendingVerificationUser).then(() => {
                        setPendingVerificationUser(null);
                        setError("");
                        setInfoMsg("");
                        switchMode("register");
                      });
                    } else {
                      // From register / forgot → back to login
                      switchMode("login");
                    }
                  }}
                  title="Kembali ke halaman masuk"
                  aria-label="Kembali ke halaman masuk"
                  className="theme-smooth flex items-center justify-center size-9 sm:size-10 rounded-xl sm:rounded-2xl border border-border/80 bg-card/95 hover:bg-card text-foreground shadow-soft hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <ArrowLeft className="size-4 sm:size-[18px]" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 3. Elemen Pojok Tepi Bawah ── */}
      {/* Pojok Kiri Bawah: Kebijakan Privasi | Syarat & Ketentuan | Bantuan */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-7 z-20 flex items-center gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-muted-foreground select-none">
        <span className="hover:text-foreground transition-colors cursor-pointer">
          Kebijakan Privasi
        </span>
        <span>|</span>
        <span className="hover:text-foreground transition-colors cursor-pointer">
          Syarat & Ketentuan
        </span>
        <span>|</span>
        <span className="hover:text-foreground transition-colors cursor-pointer">
          Bantuan
        </span>
      </div>

      {/* Pojok Kanan Bawah: Copyright TreeNest */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-7 z-20 flex items-center gap-3 text-[11px] sm:text-xs text-muted-foreground select-none">
        <span>TreeNest © {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
