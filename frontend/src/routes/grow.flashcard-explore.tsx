import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Compass,
  Search,
  ArrowLeft,
  Layers,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useIsAdmin } from "@/lib/auth-context";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  getSharedFlashDecks,
  deleteSharedFlashDeck,
  incrementSharedDeckDownloads,
  type SharedFlashDeck,
} from "@/lib/firestore-service";
import { generateId, type FlashDeck, type FlashCard } from "@/lib/grow-tools";
import { playCardFlip, playLevelUpFanfare, playTapPop } from "@/lib/sound-fx";
import { awardActivityExp } from "@/lib/exp-service";

export const Route = createFileRoute("/grow/flashcard-explore")({
  head: () => ({
    meta: [
      { title: "Eksplor Komunitas FlashCard — TreeNest" },
      {
        name: "description",
        content: "Cari, pratinjau, dan impor template kartu FlashCard dari komunitas pengguna TreeNest.",
      },
      { property: "og:title", content: "Eksplor Komunitas FlashCard — TreeNest" },
      {
        property: "og:description",
        content: "Cari, pratinjau, dan impor template kartu FlashCard dari komunitas pengguna TreeNest.",
      },
    ],
  }),
  component: FlashcardExplorePage,
});

const CATEGORIES = [
  "Semua",
  "Bahasa",
  "Sains & Matematika",
  "Teknologi & IT",
  "Sejarah & Sosial",
  "Umum",
];

function FlashcardExplorePage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const uid = profile?.uid ?? user?.uid ?? "guest";
  const isAdmin = useIsAdmin();

  // Local storage for user's personal decks & cards
  const [personalDecks, setPersonalDecks] = useLocalStorage<FlashDeck[]>(
    `treenest.flashcard.decks.${uid}`,
    [],
  );
  const [personalCards, setPersonalCards] = useLocalStorage<FlashCard[]>(
    `treenest.flashcard.cards.${uid}`,
    [],
  );

  const [decks, setDecks] = useState<SharedFlashDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Preview Modal state
  const [previewDeck, setPreviewDeck] = useState<SharedFlashDeck | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewFlipped, setPreviewFlipped] = useState(false);
  const [previewTab, setPreviewTab] = useState<"flip" | "list">("flip");

  // Import notification / feedback state
  const [importedDeckTitle, setImportedDeckTitle] = useState<string | null>(null);
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);

  useScrollLock(Boolean(previewDeck || importedDeckTitle || deletingDeckId));

  async function loadDecks() {
    setLoading(true);
    try {
      const data = await getSharedFlashDecks();
      setDecks(data);
    } catch (e) {
      console.error("Failed to load shared flashcard decks:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDecks();
  }, []);

  const filteredDecks = useMemo(() => {
    let list = decks;
    if (selectedCategory && selectedCategory !== "Semua") {
      list = list.filter((d) => d.category === selectedCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.authorUsername.toLowerCase().includes(q) ||
          (d.authorAccountId && d.authorAccountId.toLowerCase().includes(q)) ||
          d.cards.some(
            (c) =>
              (c.title && c.title.toLowerCase().includes(q)) ||
              c.front.toLowerCase().includes(q) ||
              c.back.toLowerCase().includes(q),
          ),
      );
    }
    return list;
  }, [decks, selectedCategory, searchQuery]);

  // Handle Import Deck to Personal Flashcard
  async function handleImportDeck(sharedDeck: SharedFlashDeck) {
    playTapPop(1);

    const newDeckId = generateId();
    const newDeck: FlashDeck = {
      id: newDeckId,
      name: `${sharedDeck.title} (Komunitas)`,
      createdAt: Date.now(),
      isImported: true,
    };

    const newCards: FlashCard[] = sharedDeck.cards.map((c) => ({
      id: generateId(),
      deckId: newDeckId,
      title: c.title || c.front,
      front: c.front,
      back: c.back,
      createdAt: Date.now(),
    }));

    setPersonalDecks((prev) => [newDeck, ...prev]);
    setPersonalCards((prev) => [...newCards, ...prev]);

    // Update download count statistics
    incrementSharedDeckDownloads(sharedDeck.id);
    awardActivityExp(uid, "flashcard");
    playLevelUpFanfare();

    setDecks((prev) =>
      prev.map((d) =>
        d.id === sharedDeck.id ? { ...d, downloadsCount: (d.downloadsCount || 0) + 1 } : d,
      ),
    );

    setImportedDeckTitle(sharedDeck.title);
  }

  // Handle Delete Shared Deck by author or admin
  async function handleDeleteShared(deckId: string) {
    const res = await deleteSharedFlashDeck(deckId, uid, isAdmin);
    if (res.success) {
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
      if (previewDeck?.id === deckId) setPreviewDeck(null);
      setDeletingDeckId(null);
      playTapPop(0);
    } else {
      alert(res.error || "Gagal menghapus template");
    }
  }

  return (
    <PageShell
      title="Eksplor Komunitas FlashCard"
      description="Temukan dan impor template kartu FlashCard berkualitas yang dibagikan oleh sesama pengguna TreeNest."
    >
      <div className="space-y-6 pb-12">
        {/* Tombol Navigasi Kembali & Aksi Atas */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              playTapPop(0);
              navigate({ to: "/grow/flashcard" });
            }}
            className="group flex items-center gap-2 rounded-2xl border border-border/80 bg-card px-4 py-2.5 text-xs sm:text-sm font-bold text-foreground shadow-soft transition-all hover:bg-secondary hover:border-primary active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            <span>Kembali</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-secondary/40 px-3 py-1.5 rounded-xl">
            <span>{decks.length} Template Tersedia</span>
          </div>
        </div>

        {/* Bar Pencarian & Filter Kategori */}
        <div className="space-y-4 rounded-3xl border border-border/80 bg-card/80 p-4 sm:p-6 shadow-soft backdrop-blur-md">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul deck, materi, atau nama pembuat..."
              className="w-full rounded-2xl border border-input bg-card dark:bg-secondary/50 py-2.5 pl-10 pr-10 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none shadow-xs focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Kategori Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    playTapPop(0);
                    setSelectedCategory(cat);
                  }}
                  className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm scale-105"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Daftar Kartu Template FlashCard */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs font-medium text-muted-foreground">Memuat template komunitas...</p>
          </div>
        ) : filteredDecks.length === 0 ? (
          <motion.div
            key={`empty-${selectedCategory}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/50 p-8 sm:p-12 text-center space-y-3"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Compass className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">Tidak Ada Template Ditemukan</h3>
            <p className="max-w-md text-xs text-muted-foreground">
              {searchQuery
                ? `Tidak ada template yang cocok dengan pencarian "${searchQuery}". Coba kata kunci lain.`
                : `Belum ada template yang dibagikan untuk kategori "${selectedCategory}". Jadilah yang pertama mengekspor deck FlashCard kamu!`}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`grid-${selectedCategory}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {filteredDecks.map((deck) => {
              const isOwner = Boolean(uid && uid !== "guest" && deck.authorUid === uid);
              return (
                <div
                  key={deck.id}
                  className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
                >
                  {/* Top: Category & Badge Cards */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                        {deck.category}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-bold text-foreground">
                        <Layers className="size-3 text-muted-foreground" />
                        {deck.cardsCount} Kartu
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground tracking-tight line-clamp-1">
                        {deck.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {deck.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Creator & Actions */}
                  <div className="mt-4 pt-3 border-t border-border/60 space-y-3">
                    {/* Creator Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        {deck.authorAvatarUrl ? (
                          <img
                            src={deck.authorAvatarUrl}
                            alt={deck.authorUsername}
                            className="size-5 rounded-full object-cover ring-1 ring-border shrink-0"
                          />
                        ) : (
                          <span
                            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-primary-foreground"
                            style={{
                              backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${deck.authorHue ?? 150}), oklch(0.66 0.13 ${(deck.authorHue ?? 150) + 25}))`,
                            }}
                          >
                            {deck.authorInitials || "TN"}
                          </span>
                        )}
                        <span className="font-semibold text-foreground truncate max-w-[120px]">
                          {deck.authorUsername}
                        </span>
                        {deck.authorAccountId && (
                          <span className="text-[10px] text-muted-foreground/80 font-mono">
                            ({deck.authorAccountId})
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {deck.downloadsCount}x diimpor
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          playTapPop(0);
                          setPreviewDeck(deck);
                          setPreviewIndex(0);
                          setPreviewFlipped(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-secondary/60 py-2 text-xs font-bold text-foreground hover:bg-secondary hover:border-border transition-colors cursor-pointer active:scale-95"
                      >
                        <Eye className="size-3.5 text-muted-foreground" />
                        <span>Pratinjau</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleImportDeck(deck)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Download className="size-3.5" />
                        <span>Import</span>
                      </button>

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setDeletingDeckId(deck.id)}
                          title="Hapus dari Komunitas"
                          className="rounded-xl border border-destructive/30 p-2 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer active:scale-95"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ── MODAL PRATINJAU KARTU (PREVIEW MODAL) ── */}
      <AnimatePresence>
        {previewDeck && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setPreviewDeck(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-float space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {previewDeck.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {previewDeck.cardsCount} Kartu
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-bold text-foreground truncate">
                    {previewDeck.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDeck(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Tab Switcher: Flip Card vs List */}
              <div className="flex rounded-xl bg-secondary/50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    playTapPop(0);
                    setPreviewTab("flip");
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    previewTab === "flip"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mode Flip Card
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapPop(0);
                    setPreviewTab("list");
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    previewTab === "list"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Daftar Semua Kartu
                </button>
              </div>

              {/* Content Preview */}
              {previewTab === "flip" ? (
                <div className="space-y-4">
                  {/* Interactive Flip Card */}
                  {previewDeck.cards[previewIndex] && (
                    <div
                      onClick={() => {
                        playCardFlip();
                        setPreviewFlipped((v) => !v);
                      }}
                      className="group relative flex min-h-[190px] w-full flex-col items-center justify-center rounded-2xl border border-border/80 bg-secondary/40 p-6 text-center shadow-inner cursor-pointer select-none transition-all hover:border-primary/50"
                    >
                      <span className="absolute top-3 left-3 text-[10px] font-bold text-muted-foreground">
                        {previewFlipped ? "Sisi Belakang (Jawaban/Arti)" : "Sisi Depan (Pertanyaan/Istilah)"}
                      </span>
                      <span className="absolute top-3 right-3 text-[10px] font-bold text-primary">
                        Kartu {previewIndex + 1} dari {previewDeck.cards.length}
                      </span>

                      <div className="my-auto space-y-2">
                        {previewDeck.cards[previewIndex].title && !previewFlipped && (
                          <span className="inline-block rounded-md bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {previewDeck.cards[previewIndex].title}
                          </span>
                        )}
                        <p className="text-base sm:text-lg font-bold text-foreground leading-snug">
                          {previewFlipped
                            ? previewDeck.cards[previewIndex].back
                            : previewDeck.cards[previewIndex].front}
                        </p>
                      </div>

                      <span className="mt-2 text-[10px] font-semibold text-muted-foreground/70 group-hover:text-primary transition-colors">
                        Ketuk untuk membalik kartu ↻
                      </span>
                    </div>
                  )}

                  {/* Navigation Buttons for Flip Mode */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={previewIndex === 0}
                      onClick={() => {
                        playTapPop(0);
                        setPreviewIndex((i) => Math.max(0, i - 1));
                        setPreviewFlipped(false);
                      }}
                      className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground disabled:opacity-40 hover:bg-secondary transition-colors cursor-pointer"
                    >
                      ← Sebelumnya
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playCardFlip();
                        setPreviewFlipped((v) => !v);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      <RotateCcw className="size-3" />
                      <span>Balik</span>
                    </button>

                    <button
                      type="button"
                      disabled={previewIndex === previewDeck.cards.length - 1}
                      onClick={() => {
                        playTapPop(0);
                        setPreviewIndex((i) => Math.min(previewDeck.cards.length - 1, i + 1));
                        setPreviewFlipped(false);
                      }}
                      className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground disabled:opacity-40 hover:bg-secondary transition-colors cursor-pointer"
                    >
                      Berikutnya →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {previewDeck.cards.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-muted-foreground font-semibold text-[10px]">
                        <span>Kartu #{idx + 1}</span>
                        {c.title && <span>{c.title}</span>}
                      </div>
                      <p className="font-bold text-foreground">{c.front}</p>
                      <p className="text-muted-foreground border-t border-border/40 pt-1 mt-1">
                        {c.back}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button: Import this Deck */}
              <div className="pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    handleImportDeck(previewDeck);
                    setPreviewDeck(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs sm:text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <Download className="size-4" />
                  <span>Import Deck Ini ke FlashCard Saya</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL SUKSES IMPORT ── */}
      <AnimatePresence>
        {importedDeckTitle && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setImportedDeckTitle(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="w-full max-w-sm rounded-3xl border border-primary/40 bg-card p-6 shadow-float text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/20 text-primary mx-auto">
                <CheckCircle2 className="size-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">Berhasil Mengimpor!</h3>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playTapPop(0);
                    navigate({ to: "/grow/flashcard" });
                  }}
                  className="w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Buka & Pelajari Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapPop(0);
                    setImportedDeckTitle(null);
                  }}
                  className="w-full rounded-2xl border border-border bg-card py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  Lanjut Eksplor Komunitas
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL KONFIRMASI HAPUS TEMPLATE DARI KOMUNITAS ── */}
      <AnimatePresence>
        {deletingDeckId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setDeletingDeckId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-sm rounded-3xl border border-destructive/40 bg-card p-6 shadow-float text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive mx-auto">
                <Trash2 className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Hapus dari Komunitas?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Template ini akan ditarik dari daftar publik komunitas dan pengguna lain tidak dapat mengimpornya lagi.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingDeckId(null)}
                  className="flex-1 rounded-2xl border border-border bg-card py-2 text-xs font-bold text-foreground hover:bg-secondary cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteShared(deletingDeckId)}
                  className="flex-1 rounded-2xl bg-destructive py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
