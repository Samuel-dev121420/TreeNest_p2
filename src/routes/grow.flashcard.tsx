import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layers, Plus, Trash2, RotateCcw, ArrowRight, BookOpen, X, Search } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ToolHeader } from "@/components/ToolHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { generateId, type FlashDeck, type FlashCard } from "@/lib/grow-tools";
import { useAuth } from "@/lib/auth-context";
import { awardActivityExp } from "@/lib/exp-service";

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
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
    const list = cards.filter((c) => c.deckId === activeDeckId);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q),
    );
  }, [cards, activeDeckId, searchQuery]);

  const currentCard = deckCards[studyIndex] ?? null;

  function addDeck() {
    const name = newDeckName.trim();
    if (!name) return;
    const deck: FlashDeck = { id: generateId(), name, createdAt: Date.now() };
    setDecks((prev) => [...prev, deck]);
    setNewDeckName("");
    setActiveDeckId(deck.id);
  }

  function deleteDeck(id: string) {
    setDecks((prev) => prev.filter((d) => d.id !== id));
    setCards((prev) => prev.filter((c) => c.deckId !== id));
    if (activeDeckId === id) setActiveDeckId(null);
  }

  function addCard() {
    if (!activeDeckId || !front.trim() || !back.trim()) return;
    const card: FlashCard = {
      id: generateId(),
      deckId: activeDeckId,
      front: front.trim(),
      back: back.trim(),
      createdAt: Date.now(),
    };
    setCards((prev) => [...prev, card]);
    setFront("");
    setBack("");
    if (uid !== "guest") awardActivityExp(uid, "flashcard");
  }

  function deleteCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  function startStudy() {
    if (deckCards.length === 0) return;
    setStudyIndex(0);
    setFlipped(false);
    setStudyMode(true);
  }

  function nextCard() {
    if (studyIndex < deckCards.length - 1) {
      setStudyIndex((i) => i + 1);
      setFlipped(false);
    } else {
      setStudyMode(false);
      setStudyIndex(0);
      setFlipped(false);
    }
  }

  if (studyMode && currentCard) {
    return (
      <PageShell title="" description="">
        <div className="mx-auto flex max-w-xl flex-col items-center">
          <div className="mb-4 flex w-full items-center justify-between">
            <button
              onClick={() => setStudyMode(false)}
              className="flex items-center gap-1 rounded-lg bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-soft transition-colors hover:bg-muted"
            >
              <X className="size-4" /> Keluar
            </button>
            <span className="text-sm text-muted-foreground">
              {studyIndex + 1} / {deckCards.length}
            </span>
          </div>

          <button
            onClick={() => setFlipped((v) => !v)}
            className="relative flex min-h-[16rem] w-full flex-col items-center justify-center rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft transition-transform active:scale-[0.99]"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {flipped ? "Belakang" : "Depan"}
            </p>
            <p className="mt-4 text-xl font-semibold text-foreground break-words [word-break:break-word] overflow-hidden">
              {flipped ? currentCard.back : currentCard.front}
            </p>
            <p className="mt-6 text-xs text-muted-foreground">Ketuk kartu untuk membalik</p>
          </button>

          <div className="mt-6 flex w-full gap-3">
            <button
              onClick={() => setFlipped((v) => !v)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <RotateCcw className="size-4" /> Balik
            </button>
            <button
              onClick={nextCard}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {studyIndex < deckCards.length - 1 ? (
                <>
                  Lanjut <ArrowRight className="size-4" />
                </>
              ) : (
                "Selesai"
              )}
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="" description="">
      <ToolHeader title="FlashCard" description="Buat deck dan kartu, lalu latih ingatanmu." />

      {/* Global Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama deck atau isi kartu..."
          className="w-full rounded-2xl border border-input bg-card py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none shadow-soft focus:ring-2 focus:ring-ring"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Decks */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Deck</h3>
          <div className="mt-3 flex gap-2 min-w-0">
            <input
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDeck()}
              placeholder="Nama deck..."
              className="min-w-0 flex-1 rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addDeck}
              aria-label="Tambah deck"
              className="shrink-0 flex items-center justify-center rounded-xl bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {filteredDecks.length === 0 ? (
              <EmptyState
                icon={Layers}
                title={searchQuery ? "Deck tidak ditemukan" : "Belum ada deck"}
                description={searchQuery ? "Coba kata kunci lain." : "Tambah deck pertama di atas."}
              />
            ) : (
              filteredDecks.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setActiveDeckId(d.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors min-w-0 ${
                    activeDeckId === d.id
                      ? "border-primary/50 bg-primary/10 font-semibold text-primary"
                      : "border-border/50 bg-background dark:bg-secondary/40 hover:border-primary/30 hover:bg-muted"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{d.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDeck(d.id);
                    }}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-2">
          {!activeDeck ? (
            <EmptyState
              icon={BookOpen}
              title="Pilih deck"
              description="Pilih deck di sebelah kiri untuk mulai."
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-foreground">{activeDeck.name}</h3>
                <button
                  onClick={startStudy}
                  disabled={deckCards.length === 0}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Mode Belajar
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCard()}
                  placeholder="Sisi depan"
                  className="rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCard()}
                  placeholder="Sisi belakang"
                  className="rounded-xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={addCard}
                disabled={!front.trim() || !back.trim()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
              >
                <Plus className="size-4" /> Tambah Kartu
              </button>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {deckCards.length === 0 ? (
                  <EmptyState
                    icon={Layers}
                    title="Deck masih kosong"
                    description="Tambah kartu di atas."
                  />
                ) : (
                  deckCards.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col justify-between rounded-2xl border-2 border-border/70 bg-background dark:bg-secondary/40 p-4 transition-all hover:border-primary/50 hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary mb-1">
                          Sisi Depan:
                        </p>
                        <p className="text-sm font-bold text-foreground break-words [word-break:break-word] overflow-hidden">{c.front}</p>
                        <div className="my-2 h-px bg-border/40" />
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                          Sisi Belakang:
                        </p>
                        <p className="text-sm font-medium text-foreground/90 break-words [word-break:break-word] overflow-hidden">{c.back}</p>
                      </div>
                      <button
                        onClick={() => deleteCard(c.id)}
                        className="mt-3 self-end rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Hapus Kartu"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
