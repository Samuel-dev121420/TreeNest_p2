import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    User,
    Mail,
    Shield,
    Flame,
    Trophy,
    Sparkles,
    TreePine,
    LogOut,
    Check,
    Save,
    Moon,
    Sun,
    Volume2,
    Calendar,
} from 'lucide-react';
import TopHeaderBanner from '@/Components/TopHeaderBanner';
import BottomNav from '@/Components/BottomNav';

export default function Account() {
    const { props } = usePage();
    const user = (props.auth as any)?.user;

    const [savedSuccess, setSavedSuccess] = useState(false);

    const form = useForm({
        name: user?.name || '',
        email: user?.email || '',
        bio: user?.bio || '',
    });

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => {
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
            },
        });
    };

    const handleLogout = () => {
        router.post(route('logout'));
    };

    const expForNextLevel = 100 * (user?.level || 1);
    const expProgress = Math.min(100, Math.round(((user?.exp || 0) % 100)));

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-100/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20 text-neutral-800 dark:text-neutral-100 font-sans pb-28 pt-16">
            <Head title="Pengaturan Akun & Profil — TreeNest" />
            <TopHeaderBanner />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
                {/* Header Profil Utama */}
                <div className="rounded-3xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 p-6 sm:p-8 shadow-sm mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                    <div className="size-24 sm:size-28 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-4xl flex items-center justify-center shadow-md">
                        {user?.name?.charAt(0) || 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                                {user?.name}
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                                {user?.role === 'admin' ? 'ADMINISTRATOR' : 'WARGA TREENEST'}
                            </span>
                        </div>
                        <p className="text-xs text-neutral-400">
                            @{user?.username || 'username'} • ID: {user?.account_id || '@treenest'}
                        </p>

                        {/* Bar EXP Level */}
                        <div className="mt-4 max-w-md">
                            <div className="flex items-center justify-between text-xs font-semibold mb-1">
                                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                    <Trophy className="size-3.5" />
                                    Level {user?.level ?? 1}
                                </span>
                                <span className="text-neutral-400">
                                    {user?.exp ?? 0} / {expForNextLevel} EXP
                                </span>
                            </div>
                            <div className="w-full h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden p-0.5 border border-emerald-100 dark:border-neutral-700">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                                    style={{ width: `${expProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3 Ringkasan Statistik Pencapaian */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-emerald-100 dark:border-neutral-800 shadow-xs text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] text-amber-500 font-semibold mb-1">
                            <Flame className="size-3.5" />
                            <span>Streak Login</span>
                        </div>
                        <div className="text-2xl font-black text-neutral-900 dark:text-white">
                            {user?.streak ?? 1} <span className="text-xs font-semibold text-neutral-400">Hari</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-emerald-100 dark:border-neutral-800 shadow-xs text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-600 font-semibold mb-1">
                            <Sparkles className="size-3.5" />
                            <span>Total EXP</span>
                        </div>
                        <div className="text-2xl font-black text-neutral-900 dark:text-white">
                            {user?.exp ?? 0}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-emerald-100 dark:border-neutral-800 shadow-xs text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] text-sky-500 font-semibold mb-1">
                            <TreePine className="size-3.5" />
                            <span>Pohon Aktif</span>
                        </div>
                        <div className="text-2xl font-black text-neutral-900 dark:text-white">
                            1
                        </div>
                    </div>
                </div>

                {/* Form Edit Data Diri */}
                <div className="rounded-3xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 p-6 sm:p-8 shadow-sm mb-6">
                    <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4">
                        Informasi Pribadi
                    </h2>

                    {savedSuccess && (
                        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200">
                            <Check className="size-4" />
                            <span>Profil berhasil diperbarui!</span>
                        </div>
                    )}

                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                    Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                    Alamat Email
                                </label>
                                <input
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                Bio / Motto Bertumbuh
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Tuliskan kata-kata penyemangatmu..."
                                value={form.data.bio}
                                onChange={(e) => form.setData('bio', e.target.value)}
                                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer disabled:opacity-50"
                            >
                                <Save className="size-4" />
                                <span>{form.processing ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Tombol Keluar Akun */}
                <div className="rounded-3xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 p-5 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-red-700 dark:text-red-400">
                            Keluar dari Sesi
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Akhiri sesi login kamu di perangkat ini secara aman.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
                    >
                        <LogOut className="size-4" />
                        <span>Keluar Akun</span>
                    </button>
                </div>
            </main>

            <BottomNav />
        </div>
    );
}
