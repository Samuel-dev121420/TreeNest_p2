import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    Users,
    UserPlus,
    MessageSquare,
    Eye,
    Check,
    X,
    Search,
    TreePine,
    Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import TopHeaderBanner from '@/Components/TopHeaderBanner';
import BottomNav from '@/Components/BottomNav';

interface Friend {
    id: number;
    name: string;
    username: string;
    account_id: string;
    level: number;
    avatar_url: string | null;
    is_online: boolean;
}

interface FriendshipRequest {
    id: number;
    user: Friend;
    created_at: string;
}

export default function FriendClub({
    friends = [],
    incomingRequests = [],
}: {
    friends: Friend[];
    incomingRequests: FriendshipRequest[];
}) {
    const [tab, setTab] = useState<'list' | 'requests' | 'search'>('list');
    const [searchQuery, setSearchQuery] = useState('');

    const handleRespondRequest = (requestId: number, action: 'accept' | 'reject') => {
        router.patch(
            route('friends.respond', requestId),
            { action },
            { preserveScroll: true }
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-100/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20 text-neutral-800 dark:text-neutral-100 font-sans pb-28 pt-16">
            <Head title="Friend Club — Teman Tumbuh TreeNest" />
            <TopHeaderBanner />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
                        <Users className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Friend Club — Teman Tumbuh
                        </h1>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Kunjungi pohon teman, kirim pesan langsung, dan saling semangati setiap hari.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-6 text-xs select-none">
                    <button
                        type="button"
                        onClick={() => setTab('list')}
                        className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                            tab === 'list'
                                ? 'bg-[#1c6b53] text-white shadow-xs'
                                : 'bg-white/80 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-400'
                        }`}
                    >
                        Daftar Teman ({friends.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('requests')}
                        className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer relative ${
                            tab === 'requests'
                                ? 'bg-[#1c6b53] text-white shadow-xs'
                                : 'bg-white/80 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-400'
                        }`}
                    >
                        <span>Permintaan</span>
                        {incomingRequests.length > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                                {incomingRequests.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab 1: Daftar Teman */}
                {tab === 'list' && (
                    <div className="space-y-3">
                        {friends.length === 0 ? (
                            <div className="text-center py-20 bg-white/70 dark:bg-neutral-900/70 rounded-3xl border border-dashed border-emerald-200 dark:border-neutral-800">
                                <Users className="size-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                                    Belum ada teman di daftarmu.
                                </p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">
                                    Ajak temanmu bergabung di TreeNest dan tumbuhkan hutan bersama!
                                </p>
                            </div>
                        ) : (
                            friends.map((friend) => (
                                <motion.div
                                    key={friend.id}
                                    layout
                                    className="flex items-center justify-between p-4 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 shadow-xs hover:border-emerald-300 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="size-11 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                                                {friend.name.charAt(0)}
                                            </div>
                                            {friend.is_online && (
                                                <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                                                    {friend.name}
                                                </h3>
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                                    Lvl {friend.level}
                                                </span>
                                            </div>
                                            <span className="text-xs text-neutral-400">
                                                @{friend.username}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/chat/${friend.id}`}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition"
                                        >
                                            <MessageSquare className="size-3.5" />
                                            <span>Chat</span>
                                        </Link>
                                        <Link
                                            href={`/?visit=${friend.account_id || friend.id}`}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold transition"
                                        >
                                            <TreePine className="size-3.5" />
                                            <span>Lihat Pohon</span>
                                        </Link>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                )}

                {/* Tab 2: Permintaan Masuk */}
                {tab === 'requests' && (
                    <div className="space-y-3">
                        {incomingRequests.length === 0 ? (
                            <div className="text-center py-20 bg-white/70 dark:bg-neutral-900/70 rounded-3xl border border-dashed border-emerald-200 dark:border-neutral-800">
                                <Users className="size-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                                    Tidak ada permintaan pertemanan saat ini.
                                </p>
                            </div>
                        ) : (
                            incomingRequests.map((req) => (
                                <div
                                    key={req.id}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 shadow-xs"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="size-11 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                                            {req.user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                                                {req.user.name}
                                            </h3>
                                            <span className="text-xs text-neutral-400">
                                                @{req.user.username}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleRespondRequest(req.id, 'reject')}
                                            className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                                            title="Tolak"
                                        >
                                            <X className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRespondRequest(req.id, 'accept')}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                                        >
                                            <Check className="size-3.5" />
                                            <span>Terima</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
