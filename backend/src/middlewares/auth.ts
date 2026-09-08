import type { Request, Response, NextFunction } from "express";
import { getAuthAdmin } from "../config/firebase-admin.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
  };
}

export async function verifyAuthToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Token Bearer tidak ditemukan." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const auth = getAuthAdmin();
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role as string | undefined,
    };
    next();
  } catch (error) {
    console.error("Auth verification error:", error);
    res.status(403).json({ error: "Forbidden: Token autentikasi tidak valid atau sudah kedaluwarsa." });
  }
}

export function requireAdminRole(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "admin") {
    // Also allow check via custom claim or header if provided
    res.status(403).json({ error: "Forbidden: Akses khusus Administrator diperlukan." });
    return;
  }
  next();
}
