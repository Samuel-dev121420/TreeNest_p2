import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import {
  getUserProfile,
  createUserProfile,
  isAdminEmail,
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
    error?: string;
  }>;
  sendVerificationEmail: (userToVerify?: User | null) => Promise<boolean>;
  completeVerification: (
    userToVerify: User,
    username: string,
  ) => Promise<{ success: boolean; profile?: UserProfile; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const LOCAL_STORAGE_SESSION_KEY = "treenest_session_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfileForUser(uid: string, fallbackEmail?: string) {
    let p = await getUserProfile(uid);
    if (!p) {
      // Auto create profile if missing
      const username = fallbackEmail?.split("@")[0] || "Pengguna TreeNest";
      p = await createUserProfile(uid, username, fallbackEmail || "user@treenest.com");
    }
    setProfile(p);
    awardActivityExp(uid, "daily_login").then(() => {
      getUserProfile(uid).then((updated) => {
        if (updated) setProfile(updated);
      });
    });
  }

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      // Mode Fallback / Mock
      const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setProfile(parsed);
        } catch {
          // ignore
        }
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadProfileForUser(firebaseUser.uid, firebaseUser.email || undefined);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function refreshProfile() {
    if (user) {
      await loadProfileForUser(user.uid, user.email || undefined);
    } else if (profile?.uid) {
      await loadProfileForUser(profile.uid);
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
      let p = await getUserProfile(res.user.uid);
      if (!p) {
        p = await createUserProfile(res.user.uid, email.split("@")[0] || "Pengguna", email);
      }
      setProfile(p);
      return { success: true, profile: p };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Gagal masuk ke akun.";
      return { success: false, error: errorMsg };
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
      const errorMsg = err instanceof Error ? err.message : "Gagal mendaftar akun baru.";
      return { success: false, error: errorMsg };
    }
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
          error: "Email Anda belum terverifikasi. Silakan periksa inbox/spam dan klik tautan verifikasi.",
        };
      }
      const role: UserRole =
        (userToVerify.email && isAdminEmail(userToVerify.email)) || username.toLowerCase().includes("admin")
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
        logout,
        refreshProfile,
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
