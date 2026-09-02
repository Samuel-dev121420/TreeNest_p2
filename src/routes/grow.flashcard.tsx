import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Layers,
  Plus,
  Trash2,
  RotateCcw,
  ArrowRight,
  BookOpen,
  X,
  Search,
  Play,
  Sparkles,
  FolderPlus,
  Pencil,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ToolHeader } from "@/components/ToolHeader";
import { EmptyState } from "@/components/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { generateId, type FlashDeck, type FlashCard } from "@/lib/grow-tools";
import { useAuth } from "@/lib/auth-context";
import { awardActivityExp } from "@/lib/exp-service";
import { playCardFlip, playLevelUpFanfare, playTapPop } from "@/lib/sound-fx";

export const Route = createFileRoute("/grow/flashcard")({
  head: () => ({
    meta: [
      { title: "FlashCard — Kartu Belajar TreeNest" },
      {
        name: "description",
        content: "Buat deck dan kartu depan-belakang untuk belajar di TreeNest.",
      },
      { property: "og:title", content: "FlashCard — Kartu Belajar TreeNest" },
      {
        property: "og:description",
        content: "Buat deck dan kartu depan-belakang untuk belajar di TreeNest.",
      },
    ],
  }),
  component: FlashcardPage,
});

function FlashcardPage() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";
  const [decks, setDecks] = useLocalStorage<FlashDeck[]>(`treenest.flashcard.decks.${uid}`, []);
  const [cards, setCards] = useLocalStorage<FlashCard[]>(`treenest.flashcard.cards.${uid}`, []);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [showAddDeckForm, setShowAddDeckForm] = useState(false);
  const [showAllDecks, setShowAllDecks] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);

  // Edit Deck state
  const [editingDeck, setEditingDeck] = useState<FlashDeck | null>(null);
  const [editDeckName, setEditDeckName] = useState("");

  // Card Form state
  const [cardTitle, setCardTitle] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail & Edit Card Modal state
  const [selectedDetailCard, setSelectedDetailCard] = useState<FlashCard | null>(null);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);
  const [editCardTitle, setEditCardTitle] = useState("");
  const [editCardFront, setEditCardFront] = useState("");
  const [editCardBack, setEditCardBack] = useState("");

  // Delete Confirmation state
  const [deletingDeck, setDeletingDeck] = useState<FlashDeck | null>(null);
  const [deletingCard, setDeletingCard] = useState<FlashCard | null>(null);

  useScrollLock(
    Boolean(
      selectedDetailCard ||
        editingDeck ||
        deletingDeck ||
        deletingCard ||
        editingCard,
    ),
  );

  const filteredDecks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter((d) => d.name.toLowerCase().includes(q));
  }, [decks, searchQuery]);

  const activeDeck = useMemo(
    () => decks.find((d) => d.id === activeDeckId) ?? null,
    [decks, activeDeckId],
  );

  const deckCards = useMemo(() => {
    if (!activeDeckId) return [];
    let list = cards.filter((c) => c.deckId === activeDeckId);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          (c.title && c.title.toLowerCase().includes(q)) ||
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q),
      );
    }
    return list;
  }, [cards, activeDeckId, searchQuery]);

  const currentCard = deckCards[studyIndex] ?? null;

  // Deck Actions
  function addDeck() {
    const name = newDeckName.trim();
    if (!name) return;
    const deck: FlashDeck = { id: generateId(), name, createdAt: Date.now() };
    setDecks((prev) => [deck, ...prev]);
    setNewDeckName("");
    setActiveDeckId(deck.id);
    setShowAddDeckForm(false);
    playTapPop(1);
  }

  function handleToggleSelectDeck(deckId: string) {
    if (activeDeckId === deckId) {
      setActiveDeckId(null);
    } else {
      setActiveDeckId(deckId);
      setShowAllCards(false);
      playTapPop(0);
    }
  }

  function openEditDeck(deck: FlashDeck) {
    setEditingDeck(deck);
    setEditDeckName(deck.name);
  }

  function handleSaveEditDeck() {
    if (!editingDeck || !editDeckName.trim()) return;
    setDecks((prev) =>
      prev.map((d) => (d.id === editingDeck.id ? { ...d, name: editDeckName.trim() } : d)),
    );
    setEditingDeck(null);
    setEditDeckName("");
    playTapPop(0);
  }

  function deleteDeck(id: string) {
    setDecks((prev) => prev.filter((d) => d.id !== id));
    setCards((prev) => prev.filter((c) => c.deckId !== id));
    if (activeDeckId === id) setActiveDeckId(null);
  }

  // Card Actions
  function addCard() {
    if (!activeDeckId || (!cardTitle.trim() && !front.trim()) || !back.trim()) return;
    const card: FlashCard = {
      id: generateId(),
      deckId: activeDeckId,
      title: cardTitle.trim() || front.trim(),
      front: front.trim(),
      back: back.trim(),
      createdAt: Date.now(),
    };
    setCards((prev) => [card, ...prev]);
    setCardTitle("");
    setFront("");
    setBack("");
    playTapPop(1);
  }

  function openEditCard(card: FlashCard) {
    setEditingCard(card);
    setEditCardTitle(card.title || card.front);
    setEditCardFront(card.front);
    setEditCardBack(card.back);
  }

  function handleSaveEditCard() {
    if (!editingCard || (!editCardTitle.trim() && !editCardFront.trim()) || !editCardBack.trim())
      return;
    const updatedTitle = editCardTitle.trim() || editCardFront.trim();
    const updatedFront = editCardFront.trim();
    const updatedBack = editCardBack.trim();

    setCards((prev) =>
      prev.map((c) =>
        c.id === editingCard.id
          ? { ...c, title: updatedTitle, front: updatedFront, back: updatedBack }
          : c,
      ),
    );

    // Update selected detail card if open
    if (selectedDetailCard?.id === editingCard.id) {
      setSelectedDetailCard((prev) =>
        prev ? { ...prev, title: updatedTitle, front: updatedFront, back: updatedBack } : null,
      );
    }

    setEditingCard(null);
    playTapPop(0);
  }

  function deleteCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (selectedDetailCard?.id === id) {
      setSelectedDetailCard(null);
    }
  }

  function startStudy() {
    if (deckCards.length === 0) return;
    setStudyIndex(0);
    setFlipped(false);
    setStudyMode(true);
    playTapPop(1);
  }

  function handleFlipCard() {
    setFlipped((v) => !v);
    playCardFlip();
  }

  function nextCard() {
    if (studyIndex < deckCards.length - 1) {
      playTapPop(1);
      setStudyIndex((i) => i + 1);
      setFlipped(false);
    } else {
      playLevelUpFanfare();
      awardActivityExp(uid, "flashcard");
      setStudyMode(false);
      setStudyIndex(0);
      setFlipped(false);
    }
  }

  // Study Mode View
  if (studyMode && currentCard) {
    return (
      <PageShell title="" description="">
        <div className="mx-auto flex max-w-xl flex-col items-center">
          <div className="mb-6 flex w-full items-center justify-between">
            <button
              onClick={() => setStudyMode(false)}
              className="flex items-center gap-1.5 rounded-2xl border border-border/70 bg-card px-4 py-2 text-sm font-bold text-foreground shadow-soft transition-all hover:bg-secondary active:scale-95 cursor-pointer"
            >
              <X className="size-4" /> Keluar Mode Belajar
            </button>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
              Kartu {studyIndex + 1} dari {deckCards.length}
            </span>
          </div>

          {/* Flashcard 3D Card Display */}
          <div className="w-full [perspective:1000px]">
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
              style={{ transformStyle: "preserve-3d" }}
              onClick={handleFlipCard}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              className="relative flex min-h-[19rem] w-full flex-col items-center justify-center rounded-3xl border-2 border-border/80 bg-card p-8 text-center shadow-float cursor-pointer select-none"
            >
              {/* Front Face */}
              <div
                style={{ backfaceVisibility: "hidden" }}
                className="flex flex-col items-center justify-center size-full"
              >
                <span className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-secondary/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="size-3 text-primary" /> Depan (Pertanyaan)
                </span>
                <p className="text-xl sm:text-2xl font-bold text-foreground break-words [word-break:break-word] overflow-wrap-anywhere max-w-full leading-relaxed">
                  {currentCard.front}
                </p>
              </div>

              {/* Back Face */}
              <div
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-primary/50 bg-gradient-to-br from-primary/10 via-card to-card p-8 text-center"
              >
                <span className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-secondary/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="size-3 text-primary" /> Belakang (Jawaban)
                </span>
                <p className="text-xl sm:text-2xl font-bold text-foreground break-words [word-break:break-word] overflow-wrap-anywhere max-w-full leading-relaxed">
                  {currentCard.back}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Teks Instruksi Berada Di Luar Balok Kartu */}
          <p className="mt-3 text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <RotateCcw className="size-3.5 text-primary" /> Ketuk kartu untuk membalik
          </p>

          <div className="mt-6 flex w-full gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleFlipCard}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card py-3.5 text-sm font-bold text-foreground shadow-soft transition-colors hover:bg-secondary cursor-pointer select-none"
            >
              <RotateCcw className="size-4 text-primary" /> Balik Kartu
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={nextCard}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 cursor-pointer select-none"
            >
              {studyIndex < deckCards.length - 1 ? (
                <>
                  Kartu Berikutnya <ArrowRight className="size-4" />
                </>
              ) : (
                <>Selesai Belajar</>
              )}
            </motion.button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="" description="">
      <ToolHeader title="FlashCard" description="Buat deck dan kartu depan-belakang, untuk melatih daya ingatmu." />

      {/* Top Controls: Global Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama deck, judul kartu, atau isi materi..."
          className="w-full rounded-2xl border border-input bg-card py-3 pl-11 pr-10 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none shadow-soft focus:ring-2 focus:ring-ring"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Search Results Indicator Banner */}
      {searchQuery && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground border border-border/40">
          <span>
            Hasil pencarian untuk "<strong>{searchQuery}</strong>" (
            {activeDeckId ? deckCards.length : filteredDecks.length} item ditemukan)
          </span>
        </div>
      )}

      {/* SECTION 1: Koleksi Deck Belajar (Folder Style Full-Width Rows) */}
      <div className="mb-8 rounded-3xl border border-neutral-300 dark:border-border/80 bg-card p-5 sm:p-6 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200 dark:border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-primary shrink-0" />
            <div>
              <h2 className="text-base font-bold text-foreground">Koleksi Deck Belajar</h2>
              <p className="text-xs text-muted-foreground">Pilih deck untuk menambah atau mengulas kartu</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddDeckForm((v) => !v)}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-2xl bg-primary text-primary-foreground border border-primary/20 px-4 py-2 text-xs font-bold shadow-soft transition-all hover:bg-primary/90 active:scale-95 cursor-pointer"
          >
            {showAddDeckForm ? <X className="size-4" /> : <FolderPlus className="size-4" />}
            {showAddDeckForm ? "Tutup Form" : "Buat Deck Baru"}
          </button>
        </div>

        {/* Form Tambah Deck Baru */}
        {showAddDeckForm && (
          <div className="flex flex-col sm:flex-row gap-2 rounded-2xl bg-secondary/50 p-3 border border-neutral-300 dark:border-border/60 animate-in fade-in zoom-in-95 duration-150">
            <input
              maxLength={60}
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDeck()}
              placeholder="Ketik nama deck baru..."
              className="min-w-0 flex-1 rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addDeck}
              disabled={!newDeckName.trim()}
              className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="size-4" /> Simpan Deck
            </button>
          </div>
        )}

        {/* List Cards Deck - 1 per row (like PiNote folders) */}
        {filteredDecks.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={searchQuery ? "Deck tidak ditemukan" : "Belum ada deck"}
            description={searchQuery ? "Coba kata kunci pencarian lain." : "Klik tombol '+ Buat Deck Baru' di atas untuk memulai."}
          />
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 grid-cols-1">
              {(showAllDecks ? filteredDecks : filteredDecks.slice(0, 5)).map((d) => {
                const cardCount = cards.filter((c) => c.deckId === d.id).length;
                const isActive = activeDeckId === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => handleToggleSelectDeck(d.id)}
                    className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all hover:shadow-soft active:scale-[0.99] min-w-0 ${
                      isActive
                        ? "border-2 border-primary bg-primary/10 shadow-soft"
                        : "border-neutral-300 dark:border-border/80 bg-background dark:bg-secondary/40 hover:border-primary/50 hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                        <BookOpen className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-foreground truncate break-words">{d.name}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground font-medium">
                          {cardCount} {cardCount === 1 ? "kartu" : "kartu"} tersimpan
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isActive && (
                        <span className="hidden sm:inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-extrabold text-primary">
                          Deck Aktif
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        {/* Edit Deck button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDeck(d);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Edit Deck"
                        >
                          <Pencil className="size-4" />
                        </button>

                        {/* Delete Deck button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingDeck(d);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Hapus Deck"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show More / Show Less Button for Decks */}
            {filteredDecks.length > 5 && (
              <button
                onClick={() => setShowAllDecks((v) => !v)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-neutral-300 dark:border-border/80 bg-secondary/40 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary active:scale-[0.99] cursor-pointer"
              >
                {showAllDecks ? (
                  <>
                    Tampilkan Lebih Sedikit <ChevronUp className="size-4 text-primary" />
                  </>
                ) : (
                  <>
                    Tampilkan Lebih Banyak ({filteredDecks.length - 5} deck lainnya) <ChevronDown className="size-4 text-primary" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Active Deck Workspace with Smooth Spring Motion */}
      <AnimatePresence mode="wait">
        {!activeDeck ? (
          <motion.div
            key="empty-deck-prompt"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft"
          >
            <EmptyState
              icon={BookOpen}
              title="Pilih Deck Untuk Memulai"
              description="Silakan pilih salah satu deck di atas untuk menambah kartu baru atau mulai latihan."
            />
          </motion.div>
        ) : (
          <motion.div
            key={activeDeck.id}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            className="space-y-6"
          >
            {/* Deck Header Workspace & Hero Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    Deck Aktif
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {deckCards.length} Kartu Belajar
                  </span>
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-foreground truncate break-words">
                  {activeDeck.name}
                </h2>
              </div>

              <button
                onClick={startStudy}
                disabled={deckCards.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Play className="size-4 fill-current" /> Mulai Mode Belajar
              </button>
            </div>

            {/* Form Tambah Kartu Baru */}
            <div className="rounded-3xl border border-neutral-300 dark:border-border/80 bg-card p-5 sm:p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-border/60 pb-3">
                <Plus className="size-5 text-primary shrink-0" />
                <h3 className="text-base font-bold text-foreground">Tambah Kartu Baru</h3>
              </div>

              <div className="space-y-3">
                {/* Field 1: Judul Kartu */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                    Judul Kartu :
                  </label>
                  <input
                    maxLength={80}
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    placeholder="Ketik Judul Kartu..."
                    className="w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Field 2 & 3: Sisi Depan & Sisi Belakang */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                      Sisi Depan (Pertanyaan / Kata) :
                    </label>
                    <input
                      maxLength={250}
                      value={front}
                      onChange={(e) => setFront(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCard()}
                      placeholder="Ketik Pertanyaan/Kata..."
                      className="w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                      Sisi Belakang (Jawaban / Penjelasan) :
                    </label>
                    <input
                      maxLength={500}
                      value={back}
                      onChange={(e) => setBack(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCard()}
                      placeholder="Ketik Jawaban/Penjelasan..."
                      className="w-full rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={addCard}
                disabled={(!cardTitle.trim() && !front.trim()) || !back.trim()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="size-4" /> Simpan Kartu Ke Deck
              </button>
            </div>

            {/* Minimalist Cards Grid Section (2 cards per row) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-base font-bold text-foreground">
                  Daftar Kartu Belajar ({deckCards.length})
                </h3>
              </div>

              {deckCards.length === 0 ? (
                <div className="rounded-3xl border border-neutral-300 dark:border-border/80 bg-card p-6 text-center shadow-soft">
                  <p className="text-xs text-muted-foreground">Belum ada kartu di dalam deck ini.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2">
                    {(showAllCards ? deckCards : deckCards.slice(0, 10)).map((c, i) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedDetailCard(c)}
                        className="group relative flex flex-col justify-between rounded-2xl border border-neutral-300 dark:border-border/80 bg-background dark:bg-secondary/40 p-4 shadow-xs transition-all hover:border-primary/50 hover:bg-muted/50 hover:shadow-soft cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="flex-1 font-bold text-xs text-foreground truncate min-w-0 text-center py-1">
                            {c.title || c.front}
                          </h4>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-border/60">
                          <span className="text-[11px] font-bold text-primary group-hover:underline flex items-center gap-1">
                            <Info className="size-3.5" /> Lihat Detail
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditCard(c);
                              }}
                              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary cursor-pointer"
                              title="Edit Kartu"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingCard(c);
                              }}
                              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              title="Hapus Kartu"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Toggle Show All Cards */}
                  {deckCards.length > 10 && (
                    <button
                      onClick={() => setShowAllCards((v) => !v)}
                      className="w-full rounded-2xl border border-border/80 bg-secondary/60 py-3 text-xs font-bold text-foreground shadow-xs transition-colors hover:bg-secondary active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {showAllCards ? (
                        <>
                          Tampilkan Lebih Sedikit <ChevronUp className="size-4 text-primary" />
                        </>
                      ) : (
                        <>
                          Tampilkan Lebih Banyak ({deckCards.length - 10} kartu lainnya) <ChevronDown className="size-4 text-primary" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL POP-UP DETAIL KARTU (INFORMASI LANJUTAN) ── */}
      <AnimatePresence>
        {selectedDetailCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedDetailCard(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-float space-y-5"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Info className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground truncate">
                    Informasi Lanjutan Kartu
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDetailCard(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Body Info */}
              <div className="space-y-4">
                {/* Judul Kartu */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                    Judul Kartu:
                  </label>
                  <p className="text-lg font-extrabold text-foreground break-words overflow-wrap-anywhere">
                    {selectedDetailCard.title || selectedDetailCard.front}
                  </p>
                </div>

                {/* Sisi Depan */}
                <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 sm:p-5 space-y-1.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                    Sisi Depan (Pertanyaan / Kata)
                  </span>
                  <p className="text-sm font-semibold text-foreground break-words overflow-wrap-anywhere leading-relaxed">
                    {selectedDetailCard.front}
                  </p>
                </div>

                {/* Sisi Belakang */}
                <div className="rounded-2xl bg-secondary/70 border border-border/70 p-4 sm:p-5 space-y-1.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Sisi Belakang (Jawaban / Penjelasan)
                  </span>
                  <p className="text-sm font-medium text-foreground/90 break-words overflow-wrap-anywhere leading-relaxed">
                    {selectedDetailCard.back}
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <button
                  onClick={() => {
                    const c = selectedDetailCard;
                    setSelectedDetailCard(null);
                    openEditCard(c);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary/80 cursor-pointer"
                >
                  <Pencil className="size-4 text-primary" /> Edit Kartu
                </button>

                <button
                  onClick={() => {
                    const c = selectedDetailCard;
                    setSelectedDetailCard(null);
                    setDeletingCard(c);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive hover:text-white cursor-pointer"
                >
                  <Trash2 className="size-4" /> Hapus Kartu
                </button>

                <button
                  onClick={() => setSelectedDetailCard(null)}
                  className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL EDIT DECK ── */}
      <AnimatePresence>
        {editingDeck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setEditingDeck(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-6 shadow-float space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="size-4 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Edit Nama Deck</h3>
                </div>
                <button
                  onClick={() => setEditingDeck(null)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  Nama Deck:
                </label>
                <input
                  maxLength={60}
                  value={editDeckName}
                  onChange={(e) => setEditDeckName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEditDeck()}
                  placeholder="Ketik nama deck..."
                  className="w-full rounded-xl border border-input bg-white dark:bg-secondary/80 text-foreground px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingDeck(null)}
                  className="flex-1 rounded-xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary/70 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEditDeck}
                  disabled={!editDeckName.trim()}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL EDIT KARTU ── */}
      <AnimatePresence>
        {editingCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setEditingCard(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-float space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-2">
                  <Pencil className="size-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Edit Kartu</h3>
                </div>
                <button
                  onClick={() => setEditingCard(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                    Judul Kartu :
                  </label>
                  <input
                    maxLength={80}
                    value={editCardTitle}
                    onChange={(e) => setEditCardTitle(e.target.value)}
                    placeholder="Ketik Judul Kartu..."
                    className="w-full rounded-xl border border-input bg-white dark:bg-secondary/80 text-foreground px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                      Sisi Depan (Pertanyaan / Kata) :
                    </label>
                    <input
                      maxLength={250}
                      value={editCardFront}
                      onChange={(e) => setEditCardFront(e.target.value)}
                      placeholder="Ketik Pertanyaan/Kata..."
                      className="w-full rounded-xl border border-input bg-white dark:bg-secondary/80 text-foreground px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                      Sisi Belakang (Jawaban / Penjelasan) :
                    </label>
                    <input
                      maxLength={500}
                      value={editCardBack}
                      onChange={(e) => setEditCardBack(e.target.value)}
                      placeholder="Ketik Jawaban/Penjelasan..."
                      className="w-full rounded-xl border border-input bg-white dark:bg-secondary/80 text-foreground px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-border/60">
                <button
                  onClick={() => setEditingCard(null)}
                  className="flex-1 rounded-xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary/70 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEditCard}
                  disabled={
                    (!editCardTitle.trim() && !editCardFront.trim()) || !editCardBack.trim()
                  }
                  className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL KONFIRMASI HAPUS DECK ── */}
      <AnimatePresence>
        {deletingDeck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDeletingDeck(null)}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-6 shadow-float space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Konfirmasi Hapus Deck</h3>
                  <p className="text-xs text-muted-foreground">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed">
                Apakah Anda yakin ingin menghapus deck <strong className="text-foreground">"{deletingDeck.name}"</strong>?
                Semua kartu di dalamnya ({cards.filter((c) => c.deckId === deletingDeck.id).length} kartu) akan ikut terhapus secara permanen.
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setDeletingDeck(null)}
                  className="flex-1 rounded-xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary/70 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    deleteDeck(deletingDeck.id);
                    setDeletingDeck(null);
                  }}
                  className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-white shadow-soft transition-colors hover:bg-destructive/90 cursor-pointer"
                >
                  Hapus Deck
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL KONFIRMASI HAPUS KARTU ── */}
      <AnimatePresence>
        {deletingCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDeletingCard(null)}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-6 shadow-float space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Konfirmasi Hapus Kartu</h3>
                  <p className="text-xs text-muted-foreground">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed">
                Apakah Anda yakin ingin menghapus kartu <strong className="text-foreground">"{deletingCard.title || deletingCard.front}"</strong>?
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setDeletingCard(null)}
                  className="flex-1 rounded-xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary/70 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    deleteCard(deletingCard.id);
                    setDeletingCard(null);
                  }}
                  className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-white shadow-soft transition-colors hover:bg-destructive/90 cursor-pointer"
                >
                  Hapus Kartu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
