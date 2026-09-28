# 🌳 TreeNest Backend API Service

Modul server backend independen untuk TreeNest yang menangani operasi server-side, integrasi Firebase Admin SDK, manajemen pengguna, moderasi TreeGallery, dan metrik sistem.

## 🚀 Fitur Utama

- **Express.js & TypeScript**: Server backend cepat dan type-safe.
- **Firebase Admin SDK**: Operasi database & autentikasi server-side berhak akses tinggi.
- **Moderasi TreeGallery**: API endpoint persetujuan, penolakan, dan penghapusan riwayat video.
- **Manajemen Pengguna Admin**: Suspend, unsuspend, dan penghapusan pengguna.
- **Statistik & Metrik**: Kalkulasi metrik sistem dan aktivitas pengguna real-time.

## 📦 Menjalankan Server Backend

```bash
# Dari root project:
npm run dev:backend

# Atau dari folder backend:
cd backend
npm run dev
```

Server akan berjalan pada `http://localhost:5000` (atau port yang disetel di `.env`).

## 📡 Endpoint API

- `GET /api/health` - Cek status kesehatan server
- `GET /api/admin/users` - Mengambil daftar semua pengguna
- `POST /api/admin/users/suspend` - Menangguhkan akun pengguna
- `POST /api/admin/users/unsuspend` - Memulihkan akun pengguna
- `POST /api/admin/users/delete` - Menghapus akun pengguna permanen
- `GET /api/moderation/videos?filter=pending|history` - Mengambil video untuk dimoderasi
- `POST /api/moderation/videos/moderate` - Menyetujui atau menolak video
- `POST /api/moderation/videos/delete` - Menghapus riwayat video
- `GET /api/stats/metrics` - Mengambil metrik sistem
