import type { Request, Response } from "express";
import { getFirestoreAdmin } from "../config/firebase-admin.js";

export async function getVideosForModeration(req: Request, res: Response) {
  const filter = (req.query.filter as string) || "pending";

  try {
    const db = getFirestoreAdmin();
    let query = db.collection("gallery_videos");

    if (filter === "pending") {
      const snapshot = await query.where("status", "==", "pending").get();
      const videos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, count: videos.length, videos });
    } else {
      const snapshot = await query.where("status", "in", ["approved", "rejected"]).get();
      const videos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, count: videos.length, videos });
    }
  } catch (error) {
    console.error("Error fetching videos for moderation:", error);
    res.status(500).json({ success: false, error: "Gagal memuat video moderasi." });
  }
}

export async function moderateVideo(req: Request, res: Response) {
  const { videoId, status, comment, reason } = req.body;

  if (!videoId || !status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ success: false, error: "videoId dan status ('approved'|'rejected') wajib diisi." });
    return;
  }

  try {
    const db = getFirestoreAdmin();
    const updateData: Record<string, unknown> = {
      status,
      moderatedAt: new Date().toISOString(),
    };

    if (status === "approved" && comment) {
      updateData.approvalComment = comment;
    }
    if (status === "rejected" && reason) {
      updateData.reason = reason;
    }

    await db.collection("gallery_videos").doc(videoId).update(updateData);

    res.json({ success: true, message: `Video ${videoId} berhasil dimoderasi status: ${status}.` });
  } catch (error) {
    console.error("Error moderating video:", error);
    res.status(500).json({ success: false, error: "Gagal memperbarui status moderasi video." });
  }
}

export async function deleteVideoHistory(req: Request, res: Response) {
  const { videoId } = req.body;

  if (!videoId) {
    res.status(400).json({ success: false, error: "videoId wajib diisi." });
    return;
  }

  try {
    const db = getFirestoreAdmin();
    await db.collection("gallery_videos").doc(videoId).delete();
    res.json({ success: true, message: `Riwayat video ${videoId} berhasil dihapus.` });
  } catch (error) {
    console.error("Error deleting video history:", error);
    res.status(500).json({ success: false, error: "Gagal menghapus riwayat video." });
  }
}
