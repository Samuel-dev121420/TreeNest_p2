import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { type User } from "firebase/auth";
import {
  LogIn,
  UserPlus,
  Leaf,
  Mail,
  Lock,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Send,
  AlertCircle,
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
  const { login, signup, sendVerificationEmail, completeVerification } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // State untuk Verifikasi Email
  const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);
  const [cooldown, setCooldown] = useState(0);

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
          setInfoMsg(`Email verifikasi telah dikirim ke ${email.trim()}.`);
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
        setError(res.error || "Gagal masuk. Periksa email & password.");
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

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-sky px-4 py-12">
      {/* Background Image */}
      <img
        src={skyBg}
        alt="Latar Belakang TreeNest"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background/90" />

      {/* Card Form */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-card/60 bg-card/85 p-6 sm:p-8 shadow-soft backdrop-blur-md">
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
                {loading ? "Memeriksa Status..." : "Saya Sudah Verifikasi"}
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
                onClick={() => {
                  setPendingVerificationUser(null);
                  setError("");
                  setInfoMsg("");
                }}
                className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground underline"
              >
                Ganti Email / Batal
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
              <p className="mt-1 text-sm text-muted-foreground">
                {isRegister
                  ? "Buat akun baru untuk mulai tumbuh"
                  : "Selamat datang kembali di ruang tenangmu"}
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
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  !isRegister
                    ? "bg-card text-foreground shadow-sm"
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
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  isRegister
                    ? "bg-card text-foreground shadow-sm"
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
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {isRegister && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Rafi"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-2xl border border-input bg-background/60 py-2.5 pl-10 pr-4 text-sm font-medium text-foreground transition-all focus:border-primary focus:bg-background focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-input bg-background/60 py-2.5 pl-10 pr-4 text-sm font-medium text-foreground transition-all focus:border-primary focus:bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-input bg-background/60 py-2.5 pl-10 pr-4 text-sm font-medium text-foreground transition-all focus:border-primary focus:bg-background focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center rounded-2xl bg-gradient-leaf py-3 text-sm font-bold text-white shadow-soft transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Memproses..." : isRegister ? "Daftar Akun Baru" : "Masuk ke TreeNest"}
              </button>
            </form>

            {/* Tip Mode Admin */}
            <div className="mt-6 border-t border-border/50 pt-4 text-center text-xs text-muted-foreground">
              <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-primary/80">
                <ShieldCheck className="h-3.5 w-3.5" />
                Catatan Mode Admin:
              </p>
              <p className="mt-0.5 text-[11px]">
                Masuk dengan email yang mengandung kata <strong>"admin"</strong> (misal:{" "}
                <code>admin@treenest.com</code>) untuk langsung masuk ke Halaman Moderasi Admin.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
