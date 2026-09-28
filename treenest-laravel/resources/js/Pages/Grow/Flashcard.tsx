import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    Layers,
    Plus,
    BookOpen,
    Play,
    RotateCw,
    Check,
    X,
    Sparkles,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TopHeaderBanner from '@/Components/TopHeaderBanner';
import BottomNav from '@/Components/BottomNav';

interface Card {
    id: number;
    question: string;
    answer: string;
}

interface Deck {
    id: number;
    title: string;
    description: string | null;
    category: string | null;
    is_public: boolean;
    cards_count?: number;
    cards?: Card[];
}

export default function Flashcard({
    myDecks = [],
    publicDecks = [],
}: {
    myDecks: Deck[];
    publicDecks: Deck[];
}) {
    const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [studyingDeck, setStudyingDeck] = useState<Deck | null>(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    // Form Tambah Deck
    const deckForm = useForm({
        title: '',
        description: '',
        category: 'Umum',
        is_public: false,
    });

    const handleCreateDeck = (e: React.FormEvent) => {
        e.preventDefault();
        deckForm.post(route('flashcard.deck.store'), {
            preserveScroll: true,
            onSuccess: () => {
                deckForm.reset();
                setShowCreateModal(false);
            },
        });
    };

    const handleStartStudy = (deck: Deck) => {
        setStudyingDeck(deck);
        setCurrentCardIndex(0);
        setIsFlipped(false);
    };

    const currentDeckCards = studyingDeck?.cards || [
        { id: 1, question: 'Apa tujuan utama TreeNest?', answer: 'Ruang tenang untuk produktivitas, merawat pohon, dan bertumbuh bersama teman.' },
        { id: 2, question: 'Berapa level untuk membuka Rumah Pohon?', answer: 'Level 5 (Tahap Pohon Cemara / Rumah Pohon).' },
        { id: 3, question: 'Bagaimana cara menambah EXP pohon?', answer: 'Menyiram pohon, menyelesaikan tugas harian, dan fokus belajar.' },
    ];

    const currentCard = currentDeckCards[currentCardIndex];

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-100/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20 text-neutral-800 dark:text-neutral-100 font-sans pb-28 pt-16">
            <Head title="FlashCard — Kartu Hafalan TreeNest" />
            <TopHeaderBanner />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
                                <Layers className="size-5" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                FlashCard — Kartu Hafalan
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            Metode belajar aktif dengan pengulangan spasi untuk menguasai materi apa saja.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md transition cursor-pointer select-none active:scale-95"
                    >
                        <Plus className="size-4" />
                        <span>Buat Deck Baru</span>
                    </button>
                </div>

                {/* Modus Belajar Aktif jika Deck dipilih */}
                {studyingDeck ? (
                    <div className="rounded-3xl bg-white/95 dark:bg-neutral-900/95 border border-indigo-100 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <button
                                type="button"
                                onClick={() => setStudyingDeck(null)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
                            >
                                <ChevronLeft className="size-4" />
                                <span>Kembali ke Daftar Deck</span>
                            </button>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                Kartu {currentCardIndex + 1} dari {currentDeckCards.length}
                            </span>
                        </div>

                        {/* Kartu Flip Interaktif */}
                        <div
                            onClick={() => setIsFlipped(!isFlipped)}
                            className="w-full h-72 sm:h-80 rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-indigo-100/30 dark:from-neutral-800 dark:to-neutral-900 border-2 border-dashed border-indigo-200 dark:border-neutral-700 flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-transform hover:scale-[1.01]"
                        >
                            <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-3">
                                {isFlipped ? 'Jawaban' : 'Pertanyaan (Klik untuk membalik)'}
                            </span>
                            <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white max-w-lg">
                                {isFlipped ? currentCard.answer : currentCard.question}
                            </p>
                        </div>

                        {/* Tombol Navigasi Kartu */}
                        <div className="flex items-center justify-between mt-6 select-none">
                            <button
                                type="button"
                                disabled={currentCardIndex === 0}
                                onClick={() => {
                                    setCurrentCardIndex((i) => Math.max(0, i - 1));
                                    setIsFlipped(false);
                                }}
                                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
                            >
                                <ChevronLeft className="size-4" />
                                <span>Sebelumnya</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsFlipped(!isFlipped)}
                                className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
                                title="Balik Kartu"
                            >
                                <RotateCw className="size-5" />
                            </button>

                            <button
                                type="button"
                                disabled={currentCardIndex === currentDeckCards.length - 1}
                                onClick={() => {
                                    setCurrentCardIndex((i) => Math.min(currentDeckCards.length - 1, i + 1));
                                    setIsFlipped(false);
                                }}
                                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
                            >
                                <span>Selanjutnya</span>
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Daftar Deck */
                    <div>
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-2 mb-6 text-xs select-none">
                            <button
                                type="button"
                                onClick={() => setActiveTab('my')}
                                className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                                    activeTab === 'my'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-white/80 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-400'
                                }`}
                            >
                                Deck Saya ({myDecks.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('public')}
                                className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                                    activeTab === 'public'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-white/80 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-400'
                                }`}
                            >
                                Jelajahi Komunitas
                            </button>
                        </div>

                        {/* List Deck Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(activeTab === 'my' ? myDecks : publicDecks).length === 0 ? (
                                <div className="col-span-full text-center py-20 bg-white/70 dark:bg-neutral-900/70 rounded-3xl border border-dashed border-emerald-200 dark:border-neutral-800">
                                    <Layers className="size-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                                        Belum ada deck flashcard.
                                    </p>
                                    <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">
                                        Buat deck pertamamu untuk mulai menghafal materi.
                                    </p>
                                </div>
                            ) : (
                                (activeTab === 'my' ? myDecks : publicDecks).map((deck) => (
                                    <div
                                        key={deck.id}
                                        className="rounded-3xl p-5 bg-white/95 dark:bg-neutral-900/95 border border-emerald-100/80 dark:border-neutral-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                                    >
                                        <div>
                                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                {deck.category || 'Umum'}
                                            </span>
                                            <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-2">
                                                {deck.title}
                                            </h3>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                                                {deck.description || 'Tidak ada deskripsi.'}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800">
                                            <span className="text-xs text-neutral-400">
                                                {deck.cards_count ?? 3} Kartu
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleStartStudy(deck)}
                                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                                            >
                                                <Play className="size-3.5 fill-current" />
                                                <span>Pelajari</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Modal Tambah Deck */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-emerald-100 dark:border-neutral-800 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                    Buat Deck Flashcard Baru
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                                >
                                    <X className="size-4 text-neutral-500" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateDeck} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Judul Deck *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Kosakata Bahasa Jepang N5"
                                        value={deckForm.data.title}
                                        onChange={(e) => deckForm.setData('title', e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Deskripsi Singkat
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Apa isi materi deck ini..."
                                        value={deckForm.data.description}
                                        onChange={(e) => deckForm.setData('description', e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Kategori
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Bahasa, Sains, Sejarah, Coding..."
                                        value={deckForm.data.category}
                                        onChange={(e) => deckForm.setData('category', e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={deckForm.processing}
                                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                                    >
                                        {deckForm.processing ? 'Menyimpan...' : 'Buat Deck'}
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
