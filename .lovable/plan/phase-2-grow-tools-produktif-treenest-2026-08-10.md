# Phase 2 — Grow Tools Produktif TreeNest

## Tujuan

Mengubah halaman Grow dari sekadar daftar "Coming Soon" menjadi dashboard yang bisa dipakai, dengan 4 tools produktif: PiNote, FlashCard, Study Session, dan Daily Task.

## Asumsi

- Data (catatan, deck, kartu, task, sesi) disimpan sementara di browser lewat `localStorage`, jadi kamu langsung bisa coba tanpa login dulu.
- Backend/database untuk akun dan sinkron data akan dikerjakan di Phase 4.
- Semua 4 tools dikerjakan dalam Phase 2 ini, tapi dengan fitur inti saja (tidak over-engineer).

## Struktur Halaman

```text
/grow                 → Dashboard launcher, pilih tool
/grow/pinote          → PiNote: folder + catatan + editor sederhana
/grow/flashcard       → FlashCard: deck + kartu depan-belakang + mode belajar
/grow/study           → Study Session: timer fokus dengan durasi custom
/grow/dailytask       → Daily Task: checklist berdasarkan tanggal
```

## Detail Tiap Tool

### 1. PiNote

- Sidebar kiri: daftar folder (bisa tambah/hapus).
- Tengah: daftar catatan dalam folder yang dipilih.
- Kanan: editor catatan (judul + isi teks).
- Data: `{ folders: [...], notes: [...] }` di localStorage.

### 2. FlashCard

- Daftar deck (bisa tambah/hapus).
- Dalam deck: daftar kartu (depan/belakang), bisa tambah/edit/hapus.
- Mode belajar: tampilkan depan → klik "Balik" → tampilkan belakang → "Lanjut".
- Data: `{ decks: [...], cards: [...] }` di localStorage.

### 3. Study Session

- Pilih durasi (15, 25, 45, 60 menit, atau custom).
- Timer countdown dengan tombol Start / Pause / Reset.
- Saat selesai: tampilkan notifikasi ringan dan opsi tambah EXP (dummy, karena backend belum ada).
- Data: riwayat sesi di localStorage.

### 4. Daily Task

- Kalender mini untuk pilih tanggal.
- Input tugas baru + checklist selesai/belum.
- Tugas tersimpan per tanggal di localStorage.

## Desain

- Tetap mengikuti design system TreeNest: warna OKLCH, rounded-3xl, shadow-soft, font Baloo 2 + Nunito.
- Tiap tool punya header kecil dengan tombol kembali ke `/grow`.
- Komponen reusable: `ToolCard`, `ToolHeader`, `EmptyState`.

## Verifikasi

- Build berhasil tanpa error.
- Preview tiap halaman tools terlihat rapi di desktop dan mobile.
- Data localStorage bertahan setelah refresh.

## Estimasi

Sekitar 1 sesi pengerjaan untuk 4 tools inti + routing + verifikasi.
