import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    CheckSquare,
    Plus,
    Trash2,
    Sparkles,
    Flame,
    Calendar,
    CheckCircle2,
    Circle,
    X,
    Trophy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import TopHeaderBanner from '@/Components/TopHeaderBanner';
import BottomNav from '@/Components/BottomNav';

interface Task {
    id: number;
    title: string;
    description: string | null;
    completed: boolean;
    exp_reward: number;
    due_date: string | null;
}

export default function DailyTask({ tasks = [] }: { tasks: Task[] }) {
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [showAddModal, setShowAddModal] = useState(false);

    // Form Tambah Tugas
    const form = useForm({
        title: '',
        description: '',
        exp_reward: 15,
        due_date: '',
    });

    const handleToggle = (task: Task) => {
        if (!task.completed) {
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.8 },
                colors: ['#34a853', '#1c6b53', '#fbbc05', '#4285f4'],
            });
        }
        router.patch(route('tasks.toggle', task.id), {}, { preserveScroll: true });
    };

    const handleDelete = (id: number) => {
        if (confirm('Hapus tugas ini?')) {
            router.delete(route('tasks.destroy', id), { preserveScroll: true });
        }
    };

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('tasks.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setShowAddModal(false);
            },
        });
    };

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalExp = tasks.filter((t) => t.completed).reduce((acc, t) => acc + t.exp_reward, 0);

    const filteredTasks = tasks.filter((t) => {
        if (filter === 'active') return !t.completed;
        if (filter === 'completed') return t.completed;
        return true;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-100/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20 text-neutral-800 dark:text-neutral-100 font-sans pb-28 pt-16">
            <Head title="Tugas Harian & Pengingat — TreeNest" />
            <TopHeaderBanner />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
                {/* Header Bagian */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
                                <CheckSquare className="size-5" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                Tugas Harian & Pengingat
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            Selesaikan misi produktifmu setiap hari untuk merawat pohon dan panen EXP!
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md transition cursor-pointer select-none active:scale-95"
                    >
                        <Plus className="size-4" />
                        <span>Tambah Tugas</span>
                    </button>
                </div>

                {/* Ringkasan Statistik */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-emerald-100/80 dark:border-neutral-800 shadow-sm">
                        <div className="text-[11px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Tugas</div>
                        <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1">
                            {tasks.length}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-emerald-100/80 dark:border-neutral-800 shadow-sm">
                        <div className="text-[11px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400">Selesai</div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {completedCount}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-emerald-100/80 dark:border-neutral-800 shadow-sm">
                        <div className="text-[11px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400">EXP Terkumpul</div>
                        <div className="text-xl sm:text-2xl font-black text-amber-500 flex items-center gap-1 mt-1">
                            <Sparkles className="size-4" />
                            <span>+{totalExp}</span>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 mb-4 text-xs select-none">
                    {(['all', 'active', 'completed'] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setFilter(tab)}
                            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                                filter === tab
                                    ? 'bg-[#1c6b53] text-white shadow-xs'
                                    : 'bg-white/80 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800'
                            }`}
                        >
                            {tab === 'all' ? 'Semua' : tab === 'active' ? 'Belum Selesai' : 'Selesai'}
                        </button>
                    ))}
                </div>

                {/* Task List */}
                <div className="space-y-2.5">
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-16 bg-white/70 dark:bg-neutral-900/70 rounded-2xl border border-dashed border-emerald-200 dark:border-neutral-800">
                            <CheckSquare className="size-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Belum ada tugas di kategori ini.</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">Tekan tombol Tambah Tugas untuk mulai mencatat.</p>
                        </div>
                    ) : (
                        filteredTasks.map((task) => (
                            <motion.div
                                key={task.id}
                                layout
                                className={`flex items-center justify-between p-4 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border transition-all shadow-xs ${
                                    task.completed
                                        ? 'border-emerald-200/60 dark:border-emerald-900/30 opacity-70 bg-emerald-50/20'
                                        : 'border-emerald-100 dark:border-neutral-800 hover:border-emerald-400 dark:hover:border-emerald-600'
                                }`}
                            >
                                <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
                                    <button
                                        type="button"
                                        onClick={() => handleToggle(task)}
                                        className="shrink-0 text-emerald-600 dark:text-emerald-400 hover:scale-110 transition cursor-pointer"
                                    >
                                        {task.completed ? (
                                            <CheckCircle2 className="size-6 fill-emerald-600 text-white dark:fill-emerald-500" />
                                        ) : (
                                            <Circle className="size-6 text-neutral-300 dark:text-neutral-600" />
                                        )}
                                    </button>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-semibold truncate ${task.completed ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-white'}`}>
                                            {task.title}
                                        </p>
                                        {task.description && (
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                                {task.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/40">
                                        <Sparkles className="size-3" />
                                        +{task.exp_reward} EXP
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(task.id)}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                                        title="Hapus Tugas"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </main>

            {/* Modal Tambah Tugas */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-emerald-100 dark:border-neutral-800 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                    Tambah Tugas Baru
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                                >
                                    <X className="size-4 text-neutral-500" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTask} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Judul Tugas *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Belajar bab 3 matematika"
                                        value={form.data.title}
                                        onChange={(e) => form.setData('title', e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Deskripsi / Catatan (Opsional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Catatan tambahan..."
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                            Hadiah EXP
                                        </label>
                                        <input
                                            type="number"
                                            min={5}
                                            max={100}
                                            value={form.data.exp_reward}
                                            onChange={(e) => form.setData('exp_reward', Number(e.target.value))}
                                            className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                            Tenggat Waktu
                                        </label>
                                        <input
                                            type="date"
                                            value={form.data.due_date}
                                            onChange={(e) => form.setData('due_date', e.target.value)}
                                            className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="flex-1 py-2.5 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                                    >
                                        {form.processing ? 'Menyimpan...' : 'Simpan Tugas'}
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
