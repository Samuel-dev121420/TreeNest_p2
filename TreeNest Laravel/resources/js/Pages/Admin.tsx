import { Head, router } from '@inertiajs/react';
import {
    Shield,
    Users,
    TreePine,
    CheckSquare,
    Sparkles,
    UserCheck,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import TopHeaderBanner from '@/Components/TopHeaderBanner';
import BottomNav from '@/Components/BottomNav';

interface UserItem {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    level: number;
    streak: number;
    created_at: string;
}

interface Stats {
    total_users: number;
    total_trees: number;
    total_tasks: number;
    completed_tasks: number;
}

export default function Admin({
    stats,
    users = [],
}: {
    stats: Stats;
    users: UserItem[];
}) {
    const [search, setSearch] = useState('');

    const handleRoleChange = (userId: number, newRole: string) => {
        router.patch(
            route('admin.user.role', userId),
            { role: newRole },
            { preserveScroll: true }
        );
    };

    const filteredUsers = users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-100/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20 text-neutral-800 dark:text-neutral-100 font-sans pb-28 pt-16">
            <Head title="Admin Panel — Moderasi TreeNest" />
            <TopHeaderBanner />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-xl bg-amber-600 text-white shadow-sm">
                        <Shield className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Panel Administrator
                        </h1>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Pantau ekosistem TreeNest, statistik pertumbuhan, dan kelola peran pengguna.
                        </p>
                    </div>
                </div>

                {/* 4 Kartu Statistik */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 shadow-xs">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <Users className="size-4 text-emerald-600" />
                            <span>Total Pengguna</span>
                        </div>
                        <div className="text-2xl font-black text-neutral-900 dark:text-white mt-2">
                            {stats?.total_users ?? 0}
                        </div>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 shadow-xs">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <TreePine className="size-4 text-emerald-600" />
                            <span>Pohon Tertanam</span>
                        </div>
                        <div className="text-2xl font-black text-neutral-900 dark:text-white mt-2">
                            {stats?.total_trees ?? 0}
                        </div>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 shadow-xs">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <CheckSquare className="size-4 text-amber-500" />
                            <span>Tugas Terdaftar</span>
                        </div>
                        <div className="text-2xl font-black text-neutral-900 dark:text-white mt-2">
                            {stats?.total_tasks ?? 0}
                        </div>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 shadow-xs">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <Sparkles className="size-4 text-emerald-500" />
                            <span>Tugas Selesai</span>
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                            {stats?.completed_tasks ?? 0}
                        </div>
                    </div>
                </div>

                {/* Tabel Pengguna */}
                <div className="rounded-3xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 p-5 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                            Manajemen Akun & Role
                        </h2>
                        <div className="relative w-full sm:w-64">
                            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Cari nama, user, email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs focus:outline-none focus:border-emerald-600"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-semibold uppercase text-[10px]">
                                <tr>
                                    <th className="pb-3 pl-2">Pengguna</th>
                                    <th className="pb-3">Email</th>
                                    <th className="pb-3">Level & Streak</th>
                                    <th className="pb-3">Role Saat Ini</th>
                                    <th className="pb-3 text-right pr-2">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                                        <td className="py-3.5 pl-2 font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                            <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div>{u.name}</div>
                                                <div className="text-[10px] text-neutral-400 font-normal">@{u.username}</div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 text-neutral-600 dark:text-neutral-300">{u.email}</td>
                                        <td className="py-3.5">
                                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Lvl {u.level}</span>
                                            <span className="text-neutral-400 ml-1.5">• {u.streak} hari</span>
                                        </td>
                                        <td className="py-3.5">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    u.role === 'admin'
                                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                                }`}
                                            >
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3.5 text-right pr-2">
                                            {u.role === 'admin' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRoleChange(u.id, 'user')}
                                                    className="px-2.5 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-[11px] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 transition cursor-pointer"
                                                >
                                                    Jadikan User
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRoleChange(u.id, 'admin')}
                                                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold transition cursor-pointer"
                                                >
                                                    Jadikan Admin
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <BottomNav />
        </div>
    );
}
