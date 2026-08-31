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
  Sparkles,
  ShieldCheck,
  TreePine,
  ArrowRight,
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
    // Memastikan tampilan light/dark mode responsif dan bersih
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
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("treenest_admin_return_path");
        }
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
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("treenest_admin_return_path");
      }
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
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-sky p-4 sm:p-6 lg:p-10 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Image Layer — Scenic Forest Landscape Background */}
      <img
        src={skyBg}
        alt="Latar Belakang Pemandangan TreeNest"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-85"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-850/40 via-slate-850/70 to-emerald-950/90 backdrop-blur-[2px]" />

      {/* Main Grid Container — Professional Split Design */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Brand & Sanctuary Showcase (Visible on Large Screens) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 sm:p-10 rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/90 via-slate-950/85 to-emerald-950/95 backdrop-blur-xl shadow-2xl relative overflow-hidden min-h-[520px] group text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_65%)] pointer-events-none" />

          {/* Top Badge & Logo */}
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-sm">
              <Sparkles className="size-3.5 text-emerald-300 animate-pulse" />
              <span>Ruang Tenang Produktivitas</span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/40">
                <Leaf className="size-7 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-display text-white tracking-tight">
                  TreeNest
                </h1>
                <p className="text-xs text-emerald-300 font-medium tracking-wide">
                  Sanctuary Growth Engine
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              Ruang tenang untuk tumbuh: rawat pohonmu setiap hari, kumpulkan EXP dari aktivitas produktif, dan kembangkan Rumah Pohon impianmu.
            </p>
          </div>

          {/* Middle Highlights */}
          <div className="relative z-10 py-6 space-y-3.5 border-y border-white/10">
            <div className="flex items-center gap-3 text-xs text-slate-100 font-medium">
              <div className="size-7 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
                <TreePine className="size-4" />
              </div>
              <span>Pertumbuhan pohon real-time hingga Level 20+</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-100 font-medium">
              <div className="size-7 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-400/30">
                <ShieldCheck className="size-4" />
              </div>
              <span>Integrasi autentikasi aman & terverifikasi</span>
            </div>
          </div>

          {/* Bottom Genuine Quote Card (Replaces Ribuan Arborist) */}
          <div className="relative z-10 p-4 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-inner">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30 shrink-0">
                <Leaf className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">"Tumbuh pelan, tapi pasti."</p>
                <p className="text-[11px] text-slate-300">Sanctuary produktivitas harianmu</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="col-span-1 lg:col-span-7 w-full max-w-md mx-auto lg:max-w-none rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/90 via-slate-950/90 to-emerald-950/95 p-6 sm:p-9 shadow-2xl backdrop-blur-2xl text-slate-100 transition-all duration-300 relative">
          
          {pendingVerificationUser ? (
            /* Email Verification Flow Screen */
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-lg shadow-emerald-500/20">
                  <Mail className="size-7 stroke-[2]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display text-white tracking-tight">
                    Verifikasi Alamat Email
                  </h2>
                  <p className="mt-1 text-xs text-slate-300">
                    Tautan konfirmasi telah dikirim ke:
                  </p>
                  <p className="mt-1 text-sm font-bold text-emerald-300 break-all bg-emerald-950/60 py-1 px-3 rounded-xl border border-emerald-500/30 inline-block">
                    {email}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-xs space-y-2.5 text-slate-200">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-400" /> Langkah Penyelesaian:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>Buka kotak masuk aplikasi email Anda (cek folder <strong>Spam</strong> jika perlu).</li>
                  <li>Klik tombol / tautan <strong>Verifikasi Email</strong> dari TreeNest.</li>
                  <li>Setelah terverifikasi, klik tombol konfirmasi di bawah ini.</li>
                </ol>
              </div>

              {/* Error & Info Alerts */}
              {error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-500/40 bg-red-500/20 p-3.5 text-xs font-semibold text-red-200">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {infoMsg && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-3.5 text-xs font-semibold text-emerald-200">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleCheckVerification}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 py-3.5 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4 stroke-[2.5]" />
                  )}
                  <span>{loading ? "Memverifikasi..." : "Saya Sudah Verifikasi"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={cooldown > 0}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-slate-900/80 hover:bg-slate-800 py-3 px-4 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="size-3.5 text-slate-300" />
                  <span>{cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : "Kirim Ulang Email Verifikasi"}</span>
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
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 hover:bg-red-500/20 py-2.5 px-4 text-xs font-medium text-red-300 transition-all cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Ganti Email / Batal Registrasi</span>
                </button>
              </div>
            </div>
          ) : (
            /* Main Login / Register Form */
            <>
              {/* Header Titles */}
              <div className="mb-6 space-y-1">
                <div className="flex items-center gap-2 lg:hidden mb-4">
                  <div className="size-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
                    <Leaf className="size-5" />
                  </div>
                  <span className="font-display font-bold text-lg text-white">TreeNest</span>
                </div>

                <h2 className="text-2xl font-bold font-display text-white tracking-tight">
                  {isRegister ? "Daftar Akun Baru" : "Selamat Datang Kembali"}
                </h2>
                <p className="text-xs text-slate-300">
                  {isRegister
                    ? "Buat akunmu untuk mulai tumbuh dan mengumpulkan EXP."
                    : "Masuk ke akun TreeNest untuk merawat pohonmu hari ini."}
                </p>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="flex rounded-2xl bg-emerald-950/80 p-1 mb-6 border border-emerald-500/30">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                    !isRegister
                      ? "bg-emerald-500/20 text-emerald-300 shadow-md border border-emerald-400/40"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <LogIn className="size-3.5" />
                  <span>Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isRegister
                      ? "bg-emerald-500/20 text-emerald-300 shadow-md border border-emerald-400/40"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <UserPlus className="size-3.5" />
                  <span>Daftar Akun</span>
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-500/40 bg-red-500/20 p-3.5 text-xs font-semibold text-red-200">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form Input Fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username Input Field (Visible on Register) */}
                {isRegister && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-semibold text-slate-200">
                      Username
                    </label>
                    <div className="relative flex items-center">
                      <UserIcon className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required={isRegister}
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="login-input w-full rounded-2xl border border-emerald-500/30 bg-emerald-950/60 py-3 pl-10 pr-4 text-sm font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 focus:bg-emerald-950 transition-all duration-200"
                      />
                    </div>
                  </div>
                )}

                {/* Email Input Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">Email</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="login-input w-full rounded-2xl border border-emerald-500/30 bg-emerald-950/60 py-3 pl-10 pr-4 text-sm font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 focus:bg-emerald-950 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Password Input Field with Forgot Password Link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-200">Password</label>
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
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer focus:outline-none"
                      >
                        Lupa Password?
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="login-input w-full rounded-2xl border border-emerald-500/30 bg-emerald-950/60 py-3 pl-10 pr-11 text-sm font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 focus:bg-emerald-950 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3.5 px-4 text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
                >
                  {loading ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4 stroke-[2.5]" />
                  )}
                  <span>
                    {loading
                      ? "Memproses..."
                      : isRegister
                      ? "Buat Akun TreeNest"
                      : "Masuk ke TreeNest"}
                  </span>
                </button>
              </form>

              {/* Bottom Note */}
              <div className="mt-7 border-t border-white/10 pt-4 text-center">
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tumbuhkan pohonmu, kumpulkan EXP harian, dan ciptakan ruang tenang bersama teman.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Lupa Password (Redesigned Modern Frosted Glass Modal) */}
      {showForgotModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowForgotModal(false);
            }}
          >
            <div className="w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950 via-slate-950 to-emerald-950 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-slate-100 relative">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
                    <KeyRound className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Pemulihan Kata Sandi</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {forgotSent ? (
                <div className="space-y-3.5 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 p-3.5 rounded-2xl">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Tautan reset password berhasil dikirim!</span>
                  </div>
                  <p className="text-xs font-bold text-white break-all bg-slate-950 p-2 rounded-xl border border-white/10">
                    {forgotEmail}
                  </p>
                  <div className="rounded-xl bg-slate-950/80 p-3 text-left text-[11px] text-slate-300 space-y-1 border border-white/10">
                    <p className="font-semibold text-slate-100">Tips Pemeriksaan:</p>
                    <p>• Periksa folder <strong>Kotak Masuk (Inbox)</strong>.</p>
                    <p>• Jika belum muncul, periksa folder <strong>Spam / Promosi</strong>.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 py-3 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
                  >
                    Tutup Modal
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendForgotReset} className="space-y-3.5">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Masukkan alamat email terdaftar untuk menerima tautan pemulihan kata sandi:
                  </p>

                  {forgotError && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/20 p-3 text-xs font-semibold text-red-200">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="login-input w-full rounded-2xl border border-emerald-500/30 bg-emerald-950/70 py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all duration-200"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 rounded-2xl border border-white/20 bg-slate-800/80 hover:bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-xs font-bold text-slate-950 transition-colors disabled:opacity-50 cursor-pointer"
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
