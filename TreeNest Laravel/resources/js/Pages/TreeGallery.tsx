import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    Images,
    Heart,
    Plus,
    X,
    TreePine,
    Sparkles,
    MessageCircle,
    Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import TopHeaderBanner from '@/Components/TopHeaderBanner';
import BottomNav from '@/Components/BottomNav';

interface Post {
    id: number;
    caption: string | null;
    image_url: string | null;
    likes_count: number;
    created_at: string;
    user: {
        id: number;
        name: string;
        username: string;
        level: number;
    };
    tree?: {
        name: string;
        stage: number;
        tree_type: string;
    };
}

export default function TreeGallery({ posts }: { posts: { data: Post[] } }) {
    const postList = posts?.data || [];
    const [showModal, setShowModal] = useState(false);

    const form = useForm({
        caption: '',
        image_url: '',
    });

    const handleLike = (post: Post) => {
        confetti({
            particleCount: 25,
            spread: 40,
            origin: { y: 0.8 },
            colors: ['#ef4444', '#f43f5e', '#ec4899'],
        });
        router.post(route('gallery.like', post.id), {}, { preserveScroll: true });
    };

    const handleCreatePost = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('gallery.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setShowModal(false);
            },
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-100/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20 text-neutral-800 dark:text-neutral-100 font-sans pb-28 pt-16">
            <Head title="TreeGallery — Galeri Pohon TreeNest" />
            <TopHeaderBanner />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
                                <Images className="size-5" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                TreeGallery Komunitas
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Pamerkan keindahan dan perkembangan pohonmu kepada sahabat se-nusantara.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md transition cursor-pointer select-none active:scale-95"
                    >
                        <Plus className="size-4" />
                        <span>Bagikan Pohon</span>
                    </button>
                </div>

                {/* Grid Postingan Galeri */}
                {postList.length === 0 ? (
                    <div className="text-center py-20 bg-white/70 dark:bg-neutral-900/70 rounded-3xl border border-dashed border-emerald-200 dark:border-neutral-800">
                        <Images className="size-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                            Belum ada postingan di TreeGallery.
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">
                            Jadilah yang pertama membagikan pertumbuhan pohonmu!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {postList.map((post) => (
                            <motion.div
                                key={post.id}
                                layout
                                className="rounded-3xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                            >
                                <div className="p-4 sm:p-5">
                                    {/* Author Info */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                                                {post.user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                                                    {post.user.name}
                                                </h4>
                                                <span className="text-[10px] text-neutral-400">
                                                    @{post.user.username} • Lvl {post.user.level}
                                                </span>
                                            </div>
                                        </div>

                                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                            <TreePine className="size-3" />
                                            {post.tree?.name || 'Pohon Cemara'}
                                        </span>
                                    </div>

                                    {/* Caption */}
                                    {post.caption && (
                                        <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 mb-3 whitespace-pre-wrap">
                                            {post.caption}
                                        </p>
                                    )}

                                    {/* Gambar Pohon (jika ada) atau Visual Sanctuary Default */}
                                    <div className="w-full h-48 rounded-2xl bg-gradient-to-b from-sky-100/60 to-emerald-100/60 dark:from-neutral-800 dark:to-emerald-950/40 flex items-center justify-center relative overflow-hidden border border-emerald-100/50 dark:border-neutral-800">
                                        <img
                                            src={post.image_url || '/assets/Pohon Cemara.png'}
                                            alt="Pohon"
                                            className="h-36 object-contain drop-shadow-md hover:scale-105 transition-transform"
                                        />
                                    </div>
                                </div>

                                {/* Footer Postingan */}
                                <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/20">
                                    <button
                                        type="button"
                                        onClick={() => handleLike(post)}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:scale-105 transition cursor-pointer"
                                    >
                                        <Heart className="size-4 fill-rose-500" />
                                        <span>{post.likes_count} Suka</span>
                                    </button>

                                    <span className="text-[11px] text-neutral-400">
                                        {new Date(post.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal Bagikan Pohon */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-emerald-100 dark:border-neutral-800 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                    Bagikan ke TreeGallery
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                                >
                                    <X className="size-4 text-neutral-500" />
                                </button>
                            </div>

                            <form onSubmit={handleCreatePost} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Cerita / Pesan *
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        placeholder="Ceritakan perjalanan merawat pohon atau pencapaian belajarmu hari ini..."
                                        value={form.data.caption}
                                        onChange={(e) => form.setData('caption', e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="flex-1 py-2.5 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                                    >
                                        {form.processing ? 'Mengunggah...' : 'Bagikan'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <BottomNav />
        </div>
    );
}
