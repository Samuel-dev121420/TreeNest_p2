import type { Request, Response } from "express";
import { getFirestoreAdmin } from "../config/firebase-admin.js";

export async function getSystemMetrics(req: Request, res: Response) {
  try {
    const db = getFirestoreAdmin();

    const [usersSnap, videosSnap, friendshipsSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("gallery_videos").get(),
      db.collection("friendships").get().catch(() => ({ size: 0, docs: [] })),
    ]);

    const totalUsers = usersSnap.size;
    let activeUsers = 0;
    let suspendedUsers = 0;
    let adminUsers = 0;

    usersSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.isSuspended) {
        suspendedUsers++;
      } else {
        activeUsers++;
      }
      if (data.role === "admin") {
        adminUsers++;
      }
    });

    let pendingVideos = 0;
    let approvedVideos = 0;
    let rejectedVideos = 0;

    videosSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === "pending") pendingVideos++;
      else if (data.status === "approved") approvedVideos++;
      else if (data.status === "rejected") rejectedVideos++;
    });

    res.json({
      success: true,
      metrics: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        adminUsers,
        totalVideos: videosSnap.size,
        pendingVideos,
        approvedVideos,
        rejectedVideos,
        totalFriendships: friendshipsSnap.size,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error calculating system metrics:", error);
    res.status(500).json({ success: false, error: "Gagal menghitung statistik sistem." });
  }
}
