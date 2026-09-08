import type { Request, Response } from "express";
import { getFirestoreAdmin, getAuthAdmin } from "../config/firebase-admin.js";

export async function getAllUsers(req: Request, res: Response) {
  try {
    const db = getFirestoreAdmin();
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, error: "Gagal memuat daftar pengguna." });
  }
}

export async function suspendUser(req: Request, res: Response) {
  const { targetUid, reason } = req.body;
  if (!targetUid) {
    res.status(400).json({ success: false, error: "targetUid wajib diisi." });
    return;
  }

  try {
    const db = getFirestoreAdmin();
    await db.collection("users").doc(targetUid).update({
      isSuspended: true,
      suspendReason: reason || "Melanggar ketentuan komunitas",
      suspendedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: `Pengguna ${targetUid} berhasil disuspend.` });
  } catch (error) {
    console.error("Error suspending user:", error);
    res.status(500).json({ success: false, error: "Gagal menangguhkan akun pengguna." });
  }
}

export async function unsuspendUser(req: Request, res: Response) {
  const { targetUid } = req.body;
  if (!targetUid) {
    res.status(400).json({ success: false, error: "targetUid wajib diisi." });
    return;
  }

  try {
    const db = getFirestoreAdmin();
    await db.collection("users").doc(targetUid).update({
      isSuspended: false,
      suspendReason: null,
      suspendedAt: null,
    });

    res.json({ success: true, message: `Akun ${targetUid} berhasil dipulihkan.` });
  } catch (error) {
    console.error("Error unsuspending user:", error);
    res.status(500).json({ success: false, error: "Gagal memulihkan akun pengguna." });
  }
}

export async function deleteUser(req: Request, res: Response) {
  const { targetUid } = req.body;
  if (!targetUid) {
    res.status(400).json({ success: false, error: "targetUid wajib diisi." });
    return;
  }

  try {
    const db = getFirestoreAdmin();
    const auth = getAuthAdmin();

    // Delete Firestore profile
    await db.collection("users").doc(targetUid).delete();

    // Delete Auth record if exists
    try {
      await auth.deleteUser(targetUid);
    } catch {
      // User might only exist in Firestore
    }

    res.json({ success: true, message: `Akun ${targetUid} berhasil dihapus permanen.` });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, error: "Gagal menghapus pengguna." });
  }
}
