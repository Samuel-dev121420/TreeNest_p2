import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth-context";
import { type User } from "firebase/auth";
import {
  LogIn,
  UserPlus,
  Leaf,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  RefreshCw,
  Send,
  AlertCircle,
  KeyRound,
  X,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import skyBg from "@/assets/sky-bg.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk — TreeNest Sanctuary" },
      {
        name: "description",
        content: "Masuk atau daftar akun TreeNest untuk menumbuhkan pohonmu dan mengumpulkan EXP.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const {
    login,
    signup,
    sendVerificationEmail,
    completeVerification,
    cancelUnverifiedRegistration,
    sendPasswordReset,
    logout,
  } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // State untuk Verifikasi Email
  const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // State untuk Lupa Password
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");
  useEffect(() => {
    // Selalu pastikan halaman login menggunakan tampilan light mode (latar putih bersih)
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    let timer: number;
    if (cooldown > 0) {
      timer = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    setLoading(true);

    if (isRegister) {
      if (!username.trim()) {
        setError("Username wajib diisi.");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Password minimal 6 karakter.");
        setLoading(false);
        return;
      }
      const res = await signup(username.trim(), email.trim(), password);
      setLoading(false);
      if (res.success) {
        if (res.requiresVerification && res.firebaseUser) {
          setPendingVerificationUser(res.firebaseUser);
          setInfoMsg(res.infoMessage || `Email verifikasi telah dikirim ke ${email.trim()}.`);
        } else if (res.profile?.role === "admin") {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/" });
        }
      } else {
        setError(res.error || "Gagal mendaftar.");
      }
    } else {
      const res = await login(email.trim(), password);
      setLoading(false);
      if (res.success) {
        if (res.profile?.role === "admin") {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/" });
        }
      } else {
        setError(
          res.error || "Email atau kata sandi yang kamu masukkan salah. Silakan periksa kembali.",
        );
      }
    }
  }

  async function handleCheckVerification() {
    if (!pendingVerificationUser) return;
    setError("");
    setInfoMsg("");
    setLoading(true);
    const res = await completeVerification(pendingVerificationUser, username.trim());
    setLoading(false);
    if (res.success) {
      if (res.profile?.role === "admin") {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/" });
      }
    } else {
      setError(res.error || "Email belum terverifikasi.");
    }
  }

  async function handleResendEmail() {
    if (!pendingVerificationUser || cooldown > 0) return;
    setError("");
    setInfoMsg("");
    const ok = await sendVerificationEmail(pendingVerificationUser);
    if (ok) {
      setInfoMsg(`Email verifikasi baru telah dikirim ke ${email}.`);
      setCooldown(30);
    } else {
      setError("Gagal mengirim ulang email. Coba lagi beberapa saat lagi.");
    }
  }

  async function handleSendForgotReset(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError("Masukkan alamat email kamu.");
      return;
    }
    setForgotLoading(true);
    const res = await sendPasswordReset(forgotEmail.trim());
    setForgotLoading(false);
    if (res.success) {
      setForgotSent(true);
    } else {
      setForgotError(res.error || "Gagal mengirim email reset. Pastikan email terdaftar.");
    }
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-sky px-4 py-12">
      {/* Background Image */}
      <img
        src={skyBg}
        alt="Latar Belakang TreeNest"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background/90" />

      {/* Card Form — Selalu Default Putih */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/90 bg-white/95 p-6 sm:p-8 shadow-float backdrop-blur-md text-neutral-900 transition-all duration-300 hover:shadow-2xl">
        {pendingVerificationUser ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/15 text-primary">
              <Mail className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Verifikasi Email Anda ✉️
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Pesan verifikasi telah dikirim ke:
              </p>
              <p className="mt-0.5 font-bold text-sm text-foreground break-all">{email}</p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 text-left text-xs space-y-2 text-muted-foreground">
              <p className="font-bold text-foreground">Langkah Penyelesaian Pendaftaran:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Buka aplikasi email Anda (cek juga folder <strong>Spam</strong>).
                </li>
                <li>
                  Klik tautan <strong>Verifikasi Email</strong> pada pesan dari Firebase/TreeNest.
                </li>
                <li>Setelah mengklik tautan di email, tekan tombol di bawah ini.</li>
              </ol>
            </div>

            {/* Error & Info Alerts */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/15 p-3 text-xs font-semibold text-destructive text-left">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {infoMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-leaf/15 p-3 text-xs font-semibold text-leaf text-left">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{infoMsg}</span>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {loading ? "Memproses Verifikasi..." : "Saya Sudah Verifikasi"}
              </button>

              <button
                type="button"
                onClick={handleResendEmail}
                disabled={cooldown > 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-input bg-background py-2.5 text-xs font-bold text-foreground transition-all hover:bg-accent disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {cooldown > 0 ? `Kirim Ulang Email (${cooldown}s)` : "Kirim Ulang Email Verifikasi"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  await cancelUnverifiedRegistration(pendingVerificationUser);
                  setPendingVerificationUser(null);
                  setError("");
                  setInfoMsg("");
                  setIsRegister(true);
                  setLoading(false);
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-2.5 text-xs font-bold text-destructive transition-all hover:bg-destructive/15 active:scale-[0.98]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Ganti Email / Batal Pendaftaran
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header Icon & Title */}
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Leaf className="h-7 w-7" />
              </div>
              <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
                TreeNest Sanctuary
              </h1>
              <p className="mt-1 text-sm text-muted-foreground transition-all duration-300">
                {isRegister
                  ? "Buat akun baru untuk mulai tumbuh"
                  : "Selamat datang di TreeNest Sanctuary"}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="mt-6 flex rounded-2xl bg-secondary/80 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError("");
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 cursor-pointer ${
                  !isRegister
                    ? "bg-card text-foreground shadow-sm scale-[1.01]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LogIn className="mr-1.5 inline-block h-3.5 w-3.5" />
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError("");
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 cursor-pointer ${
                  isRegister
                    ? "bg-card text-foreground shadow-sm scale-[1.01]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="mr-1.5 inline-block h-3.5 w-3.5" />
                Daftar Akun
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mt-4 rounded-xl bg-destructive/15 p-3 text-xs font-semibold text-destructive">
                {error}
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              {/* Smooth expandable Username field */}
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                  isRegister
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0 pointer-events-none"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="pb-0.5">
                    <label className="mb-1 block text-xs font-bold text-muted-foreground">
                      Username
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        required={isRegister}
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-2xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground py-2.5 pl-10 pr-4 text-sm font-medium transition-all focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground py-2.5 pl-10 pr-4 text-sm font-medium transition-all focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 select-none">
                  <span className="text-xs font-bold text-muted-foreground">Password</span>
                  {!isRegister && (
                    <button
                      type="button"
                      formNoValidate
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setForgotEmail(email || "");
                        setForgotSent(false);
                        setForgotError("");
                        setShowForgotModal(true);
                      }}
                      className="cursor-pointer text-xs font-bold text-primary hover:underline underline-offset-2 focus:outline-none"
                    >
                      Lupa Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground py-2.5 pl-10 pr-11 text-sm font-medium transition-all focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                    title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center rounded-2xl bg-gradient-leaf py-3 text-sm font-bold text-white shadow-soft transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Memproses..." : isRegister ? "Daftar Akun Baru" : "Masuk ke TreeNest"}
              </button>
            </form>

            {/* Note Ramah TreeNest (Pengganti Admin Note) */}
            <div className="mt-6 border-t border-border/50 pt-4 text-center">
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                🌱 Tumbuhkan pohonmu, selesaikan daily quest, dan terhubung bersama teman di ruang tenang TreeNest.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Modal Lupa Password */}
      {showForgotModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowForgotModal(false);
            }}
          >
            <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-float animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <KeyRound className="size-4" />
                  </span>
                  <h2 className="text-sm font-bold text-foreground">Pemulihan Kata Sandi</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {forgotSent ? (
                <div className="mt-4 text-center space-y-3">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-leaf bg-leaf/10 p-3 rounded-2xl">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Tautan reset password berhasil dikirim!</span>
                  </div>
                  <p className="text-xs font-bold text-foreground break-all">{forgotEmail}</p>
                  <div className="rounded-xl bg-secondary/50 p-2.5 text-left text-[11px] text-muted-foreground space-y-1">
                    <p className="font-bold text-foreground">📌 Tips Pemeriksaan:</p>
                    <p>• Periksa folder <strong>Kotak Masuk (Inbox)</strong>.</p>
                    <p>• Jika belum muncul, periksa folder <strong>Spam / Promosi / Sampah</strong>.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="mt-2 w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendForgotReset} className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Masukkan alamat email yang terdaftar di TreeNest untuk menerima tautan reset password:
                  </p>

                  {forgotError && (
                    <div className="rounded-xl bg-destructive/15 p-2.5 text-xs font-semibold text-destructive">
                      {forgotError}
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      placeholder="nama@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full rounded-2xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground py-2.5 pl-10 pr-4 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 rounded-2xl border border-border/70 bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/70 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? "Mengirim..." : "Kirim Tautan"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </main>
  );
}
