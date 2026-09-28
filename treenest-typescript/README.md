# 🌳 TreeNest Sanctuary

Project TreeNest kini menggunakan arsitektur monorepo terpisah dengan 2 folder utama di level root:
- **`frontend/`**: Web Application Client (React 19, TanStack Start/Router, Vite, TailwindCSS, Firebase Client SDK).
- **`backend/`**: Server Backend API & Service Layer (Node.js, Express, TypeScript, Firebase Admin SDK).

---

## 🚀 Cara Menjalankan Project

### Menjalankan Dari Root (NPM Workspaces)
```bash
# Menjalankan frontend web client (default):
npm run dev

# Menjalankan server backend:
npm run dev:backend

# Menjalankan frontend & backend secara bersamaan:
npm run dev:all

# Membangun bundle produksi frontend:
npm run build
```

### Menjalankan Dari Masing-masing Folder
```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
npm run dev
```

---

## 📁 Struktur Direktori
```text
tree-nest-growth-main/
├── package.json              # Root package.json (NPM Workspaces orchestrator)
├── README.md                 # Dokumentasi utama
├── frontend/                 # [FRONTEND] Web Application Client
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── public/               # Asset statis
│   └── src/                  # Source code client (routes, components, lib, hooks)
└── backend/                  # [BACKEND] Server API & Admin Services
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── README.md
    └── src/                  # Server entry, routes, controllers, config, middlewares
```

---




## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
