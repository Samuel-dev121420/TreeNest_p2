import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    FileText,
    Plus,
    Pin,
    Trash2,
    Edit2,
    X,
    Search,
    Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TopHeaderBanner from '@/Components/TopHeaderBanner';
import BottomNav from '@/Components/BottomNav';

interface Note {
    id: number;
    title: string;
    content: string | null;
    color: string | null;
    is_pinned: boolean;
    tags: string[] | null;
    created_at: string;
}

const COLOR_OPTIONS = [
    { label: 'Kuning', value: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800' },
    { label: 'Hijau', value: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800' },
    { label: 'Biru', value: 'bg-sky-100 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800' },
    { label: 'Ungu', value: 'bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800' },
    { label: 'Merah Muda', value: 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800' },
];

export default function Pinote({ notes = [] }: { notes: Note[] }) {
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);

    const form = useForm({
        title: '',
        content: '',
        color: COLOR_OPTIONS[0].value,
        is_pinned: false,
    });

    const handleOpenCreate = () => {
        setEditingNote(null);
        form.reset();
        setShowModal(true);
    };

    const handleOpenEdit = (note: Note) => {
        setEditingNote(note);
        form.setData({
            title: note.title,
            content: note.content || '',
            color: note.color || COLOR_OPTIONS[0].value,
            is_pinned: note.is_pinned,
        });
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingNote) {
            form.put(route('pinote.update', editingNote.id), {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
            });
        } else {
            form.post(route('pinote.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    setShowModal(false);
                },
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Hapus catatan ini?')) {
            router.delete(route('pinote.destroy', id), { preserveScroll: true });
        }
    };

    const handleTogglePin = (note: Note) => {
        router.put(
            route('pinote.update', note.id),
            {
                title: note.title,
                content: note.content,
                color: note.color,
                is_pinned: !note.is_pinned,
            },
            { preserveScroll: true }
        );
    };

    const filteredNotes = notes.filter((n) =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        (n.content && n.content.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-100/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20 text-neutral-800 dark:text-neutral-100 font-sans pb-28 pt-16">
            <Head title="PiNotes — Catatan Tempel TreeNest" />
            <TopHeaderBanner />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
                                <FileText className="size-5" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                PiNotes — Catatan Tempel
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            Abadikan ide, rencana, dan memo dengan papan catatan digital penuh warna.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md transition cursor-pointer select-none active:scale-95"
                    >
                        <Plus className="size-4" />
                        <span>Catatan Baru</span>
                    </button>
                </div>

                {/* Pencarian */}
                <div className="relative mb-6">
                    <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Cari catatan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-emerald-100/80 dark:border-neutral-800 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 shadow-xs"
                    />
                </div>

                {/* Grid Catatan */}
                {filteredNotes.length === 0 ? (
                    <div className="text-center py-20 bg-white/70 dark:bg-neutral-900/70 rounded-3xl border border-dashed border-emerald-200 dark:border-neutral-800">
                        <FileText className="size-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                            {search ? 'Tidak ada catatan yang cocok.' : 'Papan catatan masih kosong.'}
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">
                            Klik Catatan Baru untuk menempelkan ide pertamamu.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredNotes.map((note) => (
                            <motion.div
                                key={note.id}
                                layout
                                className={`rounded-3xl p-5 border shadow-sm transition hover:shadow-md relative flex flex-col justify-between ${
                                    note.color || COLOR_OPTIONS[0].value
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white line-clamp-2">
                                            {note.title}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePin(note)}
                                            className={`p-1.5 rounded-xl transition cursor-pointer ${
                                                note.is_pinned
                                                    ? 'text-amber-600 fill-amber-600 bg-amber-200/50 dark:bg-amber-900/40'
                                                    : 'text-neutral-400 hover:text-neutral-700'
                                            }`}
                                            title={note.is_pinned ? 'Lepas Pin' : 'Sematkan ke Atas'}
                                        >
                                            <Pin className="size-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap line-clamp-6">
                                        {note.content}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 mt-2 border-t border-black/5 dark:border-white/5 text-[11px] text-neutral-500">
                                    <span>
                                        {new Date(note.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(note)}
                                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                                            title="Edit"
                                        >
                                            <Edit2 className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(note.id)}
                                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-red-500 transition cursor-pointer"
                                            title="Hapus"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal Tambah / Edit Catatan */}
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
                                    {editingNote ? 'Edit Catatan' : 'Catatan Baru'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                                >
                                    <X className="size-4 text-neutral-500" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Judul Catatan *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Judul catatan..."
                                        value={form.data.title}
                                        onChange={(e) => form.setData('title', e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Isi Catatan
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="Tuliskan ide atau rencanamu..."
                                        value={form.data.content}
                                        onChange={(e) => form.setData('content', e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                    />
                                </div>

                                {/* Pilihan Warna */}
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        Warna Kertas
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {COLOR_OPTIONS.map((c) => (
                                            <button
                                                key={c.value}
                                                type="button"
                                                onClick={() => form.setData('color', c.value)}
                                                className={`size-7 rounded-full border-2 transition cursor-pointer ${c.value} ${
                                                    form.data.color === c.value ? 'ring-2 ring-emerald-600 scale-110' : ''
                                                }`}
                                            />
                                        ))}
                                    </div>
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
                                        {form.processing ? 'Menyimpan...' : 'Simpan'}
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
