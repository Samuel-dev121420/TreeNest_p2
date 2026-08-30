import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import {
  getUserProfile,
  createUserProfile,
  isAdminEmail,
  incrementTotalLogins,
  deleteUserAccountFully,
  getUserFriends,
  type UserProfile,
  type UserRole,
} from "./firestore-service";
import { awardActivityExp } from "./exp-service";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; profile?: UserProfile; error?: string }>;
  signup: (
    username: string,
    email: string,
    pass: string,
  ) => Promise<{
    success: boolean;
    requiresVerification?: boolean;
    firebaseUser?: User;
    profile?: UserProfile;
    infoMessage?: string;
    error?: string;
  }>;
  sendVerificationEmail: (userToVerify?: User | null) => Promise<boolean>;
  completeVerification: (
    userToVerify: User,
    username: string,
  ) => Promise<{ success: boolean; profile?: UserProfile; error?: string }>;
  cancelUnverifiedRegistration: (userToCancel?: User | null) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const LOCAL_STORAGE_SESSION_KEY = "treenest_session_user";

/** Format error Firebase Auth menjadi pesan ramah pengguna standar */
export function formatAuthError(err: unknown, defaultMsg = "Gagal memproses permintaan."): string {
  if (!err) return defaultMsg;

  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: string }).code;
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email atau kata sandi yang kamu masukkan salah. Silakan periksa kembali.";
      case "auth/invalid-email":
        return "Format alamat email tidak valid. Pastikan penulisan email sudah benar.";
      case "auth/email-already-in-use":
        return "Alamat email ini sudah terdaftar di TreeNest. Silakan gunakan tab Masuk atau Lupa Password.";
      case "auth/weak-password":
        return "Kata sandi terlalu lemah. Gunakan minimal 6 karakter.";
      case "auth/too-many-requests":
        return "Terlalu banyak percobaan masuk yang gagal. Harap tunggu beberapa saat sebelum mencoba lagi.";
      case "auth/user-disabled":
        return "Akun ini telah dinonaktifkan. Silakan hubungi admin jika memerlukan bantuan.";
      case "auth/network-request-failed":
        return "Koneksi internet bermasalah. Periksa jaringan Anda dan coba lagi.";
      case "auth/requires-recent-login":
        return "Sesi autentikasi telah kedaluwarsa. Silakan masuk kembali.";
      default:
        break;
    }
  }

  if (err instanceof Error) {
    const msg = err.message;
    if (
      msg.includes("auth/invalid-credential") ||
      msg.includes("auth/wrong-password") ||
      msg.includes("auth/user-not-found")
    ) {
      return "Email atau kata sandi yang kamu masukkan salah. Silakan periksa kembali.";
    }
    if (msg.includes("auth/invalid-email")) {
      return "Format alamat email tidak valid. Pastikan penulisan email sudah benar.";
    }
    if (msg.includes("auth/too-many-requests")) {
      return "Terlalu banyak percobaan masuk yang gagal. Harap tunggu beberapa saat sebelum mencoba lagi.";
    }
    if (msg.includes("auth/network-request-failed")) {
      return "Koneksi internet bermasalah. Periksa jaringan Anda dan coba lagi.";
    }
    if (msg.startsWith("Firebase:")) {
      return defaultMsg;
    }
    return msg;
  }

  return defaultMsg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfileForUser(uid: string, fallbackEmail?: string, isNewLogin?: boolean) {
    let p = await getUserProfile(uid);
    if (!p) {
      // Auto create profile if missing
      const username = fallbackEmail?.split("@")[0] || "Pengguna TreeNest";
      p = await createUserProfile(uid, username, fallbackEmail || "user@treenest.com");
    }

    // Sync friendCount dari pertemanan resmi yang sudah accepted
    try {
      const friends = await getUserFriends(uid);
      p.friendCount = friends.length;
    } catch {
      // ignore
    }

    if (p && (p.role === "admin" || (fallbackEmail && isAdminEmail(fallbackEmail)))) {
      p.role = "admin";
      p.level = 20;
      p.exp = 50;
    }
    setProfile(p);
    // Apply theme from profile & persist in localStorage
    if (p?.themePreference) {
      localStorage.setItem("treenest_theme", p.themePreference);
      if (p.themePreference === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    if (isNewLogin) {
      incrementTotalLogins(uid).catch(console.error);
    }
    awardActivityExp(uid, "daily_login").then(() => {
      getUserProfile(uid).then((updated) => {
        if (updated) {
          getUserFriends(uid).then((fr) => {
            updated.friendCount = fr.length;
            if (updated.role === "admin") {
              updated.level = 20;
              updated.exp = 50;
            }
            setProfile(updated);
          });
        }
      });
    });
  }

  // Synchronous theme initialization on mount to prevent any light mode flash
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("treenest_theme");
      if (storedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (storedTheme === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        const storedUser = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.themePreference === "dark") {
            document.documentElement.classList.add("dark");
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      // Mode Fallback / Mock
      const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setProfile(parsed);
          if (parsed?.themePreference === "dark") {
            document.documentElement.classList.add("dark");
          }
        } catch {
          // ignore
        }
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        if (!firebaseUser.emailVerified) {
          // Jangan muat sesi profil aktif jika email belum terverifikasi
          setProfile(null);
        } else {
          await loadProfileForUser(firebaseUser.uid, firebaseUser.email || undefined, true);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user && user.emailVerified) {
      await loadProfileForUser(user.uid, user.email || undefined);
    } else if (profile?.uid) {
      await loadProfileForUser(profile.uid);
    }
  }, [user, profile?.uid]);

  async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isFirebaseConfigured || !auth) {
      return { success: false, error: "Firebase tidak dikonfigurasi." };
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err: unknown) {
      console.error("Firebase sendPasswordResetEmail error:", err);
      return {
        success: false,
        error: formatAuthError(err, "Gagal mengirim email reset password. Pastikan email terdaftar."),
      };
    }
  }

  async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
    const currentUser = user || auth?.currentUser;
    const uid = currentUser?.uid || profile?.uid;
    if (!uid) return { success: false, error: "User tidak ditemukan." };
    try {
      await deleteUserAccountFully(uid);
      if (currentUser && isFirebaseConfigured && auth) {
        await deleteUser(currentUser);
      }
      setUser(null);
      setProfile(null);
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: formatAuthError(err, "Gagal menghapus akun.") };
    }
  }

  async function login(email: string, pass: string) {
    if (!isFirebaseConfigured || !auth) {
      // Fallback Login
      const isAdmin = email.toLowerCase().includes("admin");
      const mockUid = isAdmin ? "admin-demo-id" : "user-demo-id";
      const username = isAdmin ? "Admin TreeNest" : email.split("@")[0] || "User";
      let p = await getUserProfile(mockUid);
      if (!p) {
        p = await createUserProfile(mockUid, username, email, isAdmin ? "admin" : "user");
      }
      setProfile(p);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(p));
      return { success: true, profile: p };
    }

    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);

      // Verifikasi status email sebelum mengizinkan masuk
      if (!res.user.emailVerified) {
        await signOut(auth);
        setUser(null);
        setProfile(null);
        return {
          success: false,
          error:
            "Email Anda belum terverifikasi. Silakan periksa inbox atau folder spam email Anda untuk mengklik tautan verifikasi sebelum masuk.",
        };
      }

      let p = await getUserProfile(res.user.uid);
      if (!p) {
        p = await createUserProfile(res.user.uid, email.split("@")[0] || "Pengguna", email);
      }
      setProfile(p);
      return { success: true, profile: p };
    } catch (err: unknown) {
      return {
        success: false,
        error: formatAuthError(
          err,
          "Email atau kata sandi yang kamu masukkan salah. Silakan periksa kembali.",
        ),
      };
    }
  }

  async function signup(username: string, email: string, pass: string) {
    const role: UserRole =
      email.toLowerCase().includes("admin") || username.toLowerCase().includes("admin")
        ? "admin"
        : "user";

    if (!isFirebaseConfigured || !auth) {
      // Fallback Signup
      const mockUid = `mock-${Date.now()}`;
      const p = await createUserProfile(mockUid, username, email, role);
      setProfile(p);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(p));
      return { success: true, profile: p };
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      try {
        await sendEmailVerification(res.user);
      } catch (e) {
        console.warn("Could not send email verification immediately:", e);
      }
      return {
        success: true,
        requiresVerification: true,
        firebaseUser: res.user,
      };
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "auth/email-already-in-use"
      ) {
        try {
          const loginRes = await signInWithEmailAndPassword(auth, email, pass);
          if (!loginRes.user.emailVerified) {
            try {
              await sendEmailVerification(loginRes.user);
            } catch (e) {
              console.warn("Could not resend email verification:", e);
            }
            return {
              success: true,
              requiresVerification: true,
              firebaseUser: loginRes.user,
              infoMessage: `Email ini sudah pernah didaftarkan tetapi belum diverifikasi. Email verifikasi baru telah dikirimkan ke ${email.trim()}.`,
            };
          } else {
            await signOut(auth);
            return {
              success: false,
              error:
                "Alamat email ini sudah terdaftar dan terverifikasi. Silakan masuk menggunakan tab Masuk.",
            };
          }
        } catch {
          return {
            success: false,
            error:
              "Alamat email ini telah terdaftar di sistem. Silakan masuk menggunakan tab Masuk atau gunakan Lupa Password.",
          };
        }
      }
      const errorMsg = err instanceof Error ? err.message : "Gagal mendaftar akun baru.";
      return { success: false, error: errorMsg };
    }
  }

  async function cancelUnverifiedRegistration(userToCancel?: User | null): Promise<void> {
    const targetUser = userToCancel || user || auth?.currentUser;
    if (targetUser && !targetUser.emailVerified) {
      const uid = targetUser.uid;
      try {
        await deleteUserAccountFully(uid);
      } catch {
        // ignore
      }
      try {
        await deleteUser(targetUser);
      } catch (err) {
        console.warn("Could not delete unverified user from Firebase Auth:", err);
      }
    }
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
  }

  async function sendVerificationEmail(userToVerify?: User | null): Promise<boolean> {
    const targetUser = userToVerify || user || auth?.currentUser;
    if (!targetUser) return false;
    try {
      await sendEmailVerification(targetUser);
      return true;
    } catch (err) {
      console.error("Error sending verification email:", err);
      return false;
    }
  }

  async function completeVerification(
    userToVerify: User,
    username: string,
  ): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
    try {
      await userToVerify.reload();
      if (!userToVerify.emailVerified) {
        return {
          success: false,
          error:
            "Email Anda belum terverifikasi. Silakan periksa inbox/spam dan klik tautan verifikasi.",
        };
      }
      const role: UserRole =
        (userToVerify.email && isAdminEmail(userToVerify.email)) ||
        username.toLowerCase().includes("admin")
          ? "admin"
          : "user";
      const p = await createUserProfile(
        userToVerify.uid,
        username,
        userToVerify.email || "user@treenest.com",
        role,
      );
      setProfile(p);
      setUser(userToVerify);
      return { success: true, profile: p };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Gagal memverifikasi status email.";
      return { success: false, error: errorMsg };
    }
  }

  async function logout() {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    document.documentElement.classList.remove("dark");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        signup,
        sendVerificationEmail,
        completeVerification,
        cancelUnverifiedRegistration,
        logout,
        refreshProfile,
        sendPasswordReset,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/** Mengembalikan true jika user yang sedang login adalah Admin */
export function useIsAdmin(): boolean {
  const { user, profile } = useAuth();
  if (profile?.role === "admin") return true;
  if (user?.email && isAdminEmail(user.email)) return true;
  if (profile?.email && isAdminEmail(profile.email)) return true;
  return false;
}
