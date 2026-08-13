import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users, Search, UserPlus, UserCheck, Clock, X, Trash2, Star, Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { generateId } from "@/lib/grow-tools";
import {
  MAX_FEATURED,
  SEARCHABLE_USERS,
  seedFriends,
  seedRequests,
  seedSent,
  type Friend,
  type FriendRequest,
  type Person,
  type SentRequest,
} from "@/lib/social";
import { searchUserByAccountId } from "@/lib/firestore-service";
import { useAuth } from "@/lib/auth-context";
import { awardActivityExp } from "@/lib/exp-service";

export const Route = createFileRoute("/friend-club")({
  head: () => ({
    meta: [
      { title: "Friend Club — Teman di TreeNest" },
      {
        name: "description",
        content:
          "Cari teman lewat ID Akun, kirim permintaan, kelola daftar teman, dan pilih 5 teman yang tampil di Home.",
      },
      { property: "og:title", content: "Friend Club — Teman di TreeNest" },
      {
        property: "og:description",
        content: "Cari Teman, Permintaan Pertemanan, dan Daftar Teman dalam satu tempat.",
      },
    ],
  }),
  component: FriendClubPage,
});

const LS_FRIENDS = "treenest.friends.list";
const LS_REQUESTS = "treenest.friends.requests";
const LS_SENT = "treenest.friends.sent";
const LS_FEATURED = "treenest.friends.featured";

type Tab = "search" | "requests" | "list";

function FriendClubPage() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";
  const [friends, setFriends] = useLocalStorage<Friend[]>(LS_FRIENDS, seedFriends());
  const [requests, setRequests] = useLocalStorage<FriendRequest[]>(LS_REQUESTS, seedRequests());
  const [sent, setSent] = useLocalStorage<SentRequest[]>(LS_SENT, seedSent());
  const [featured, setFeatured] = useLocalStorage<string[]>(LS_FEATURED, []);
  const [tab, setTab] = useState<Tab>("search");

  const pendingIn = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
  const pendingOut = useMemo(() => sent.filter((s) => s.status === "pending"), [sent]);

  function ensureFeatured() {
    setFeatured((prev) => prev.slice(0, MAX_FEATURED));
  }

  function acceptRequest(req: FriendRequest) {
    const friend: Friend = {
      id: generateId(),
      accountId: req.from.accountId,
      name: req.from.name,
      initials: req.from.initials,
      hue: req.from.hue,
      since: Date.now(),
    };
    setFriends((prev) => [...prev, friend]);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    if (uid !== "guest") awardActivityExp(uid, "add_friend", req.from.accountId);
  }

  function rejectRequest(id: string) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  function sendRequest(person: Person) {
    if (friends.some((f) => f.accountId === person.accountId)) return;
    if (sent.some((s) => s.to.accountId === person.accountId)) return;
    const s: SentRequest = {
      id: generateId(),
      to: person,
      createdAt: Date.now(),
      status: "pending",
    };
    setSent((prev) => [...prev, s]);
  }

  function cancelSent(id: string) {
    setSent((prev) => prev.filter((s) => s.id !== id));
  }

  function removeFriend(id: string) {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    setFeatured((prev) => prev.filter((fid) => fid !== id));
  }

  function toggleFeatured(id: string) {
    setFeatured((prev) => {
      if (prev.includes(id)) return prev.filter((fid) => fid !== id);
      if (prev.length >= MAX_FEATURED) return prev; // batas 5
      return [...prev, id];
    });
  }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "search", label: "Cari Teman" },
    { key: "requests", label: "Permintaan", badge: pendingIn.length },
    { key: "list", label: "Daftar Teman" },
  ];

  return (
    <PageShell
      title="Friend Club"
      description="Cari teman, kelola permintaan, dan pilih Teman Tampil di Home."
    >
      {/* Tab */}
      <div className="mb-6 flex gap-2 rounded-3xl border border-border/70 bg-card p-1.5 shadow-soft">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
            {t.badge ? (
              <span
                className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  tab === t.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <SearchPanel
          friends={friends}
          sent={sent}
          onSend={sendRequest}
          goList={() => setTab("list")}
        />
      )}

      {tab === "requests" && (
        <RequestsPanel
          pendingIn={pendingIn}
          pendingOut={pendingOut}
          onAccept={acceptRequest}
          onReject={rejectRequest}
          onCancel={cancelSent}
        />
      )}

      {tab === "list" && (
        <ListPanel
          friends={friends}
          featured={featured}
          maxFeatured={MAX_FEATURED}
          onToggleFeatured={toggleFeatured}
          onRemove={removeFriend}
          ensureFeatured={ensureFeatured}
        />
      )}
    </PageShell>
  );
}

/* ------------------------- Cari Teman ------------------------- */

function SearchPanel({
  friends,
  sent,
  onSend,
  goList,
}: {
  friends: Friend[];
  sent: SentRequest[];
  onSend: (p: Person) => void;
  goList: () => void;
}) {
  const [query, setQuery] = useState("");
  const [liveUser, setLiveUser] = useState<Person | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.toUpperCase().startsWith("TN-") && q.length >= 7) {
      searchUserByAccountId(q).then((found) => {
        if (found) {
          setLiveUser({
            accountId: found.accountId,
            name: found.username,
            initials: found.initials,
            hue: found.hue,
          });
        } else {
          setLiveUser(null);
        }
      });
    } else {
      setLiveUser(null);
    }
  }, [query]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...SEARCHABLE_USERS];
    if (liveUser && !list.some((u) => u.accountId === liveUser.accountId)) {
      list = [liveUser, ...list];
    }
    if (!q) return list;
    return list.filter(
      (u) => u.name.toLowerCase().includes(q) || u.accountId.toLowerCase().includes(q),
    );
  }, [query, liveUser]);

  return (
    <div>
      <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-3 py-2 shadow-soft">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari berdasarkan nama atau ID Akun (cth: TN-1024)"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {results.length === 0 ? (
          <div className="sm:col-span-2">
            <EmptyState
              icon={Search}
              title="Tidak ditemukan"
              description="Coba nama atau ID Akun lain."
            />
          </div>
        ) : (
          results.map((u) => {
            const isFriend = friends.some((f) => f.accountId === u.accountId);
            const isSent = sent.some((s) => s.to.accountId === u.accountId);
            return (
              <div
                key={u.accountId}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft"
              >
                <Avatar initials={u.initials} hue={u.hue} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.accountId}</p>
                </div>
                {isFriend ? (
                  <button
                    onClick={goList}
                    className="flex items-center gap-1 rounded-lg bg-leaf/10 px-3 py-2 text-xs font-semibold text-leaf"
                  >
                    <UserCheck className="size-4" /> Teman
                  </button>
                ) : isSent ? (
                  <span className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">
                    <Clock className="size-4" /> Terkirim
                  </span>
                ) : (
                  <button
                    onClick={() => onSend(u)}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <UserPlus className="size-4" /> Tambah
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ----------------------- Permintaan -------------------------- */

function RequestsPanel({
  pendingIn,
  pendingOut,
  onAccept,
  onReject,
  onCancel,
}: {
  pendingIn: FriendRequest[];
  pendingOut: SentRequest[];
  onAccept: (r: FriendRequest) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Permintaan Masuk
        </h2>
        {pendingIn.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={UserPlus}
              title="Tidak ada permintaan"
              description="Permintaan pertemanan masuk akan tampil di sini."
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {pendingIn.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft"
              >
                <Avatar initials={r.from.initials} hue={r.from.hue} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{r.from.name}</p>
                  <p className="text-xs text-muted-foreground">{r.from.accountId}</p>
                </div>
                <button
                  onClick={() => onAccept(r)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Check className="size-4" /> Terima
                </button>
                <button
                  onClick={() => onReject(r.id)}
                  aria-label="Tolak permintaan"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Terkirim
        </h2>
        {pendingOut.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={Clock}
              title="Belum ada permintaan terkirim"
              description="Cari teman lalu kirim permintaan."
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {pendingOut.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft"
              >
                <Avatar initials={s.to.initials} hue={s.to.hue} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{s.to.name}</p>
                  <p className="text-xs text-muted-foreground">{s.to.accountId} · menunggu</p>
                </div>
                <button
                  onClick={() => onCancel(s.id)}
                  className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70"
                >
                  <X className="size-4" /> Batalkan
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ----------------------- Daftar Teman ------------------------ */

function ListPanel({
  friends,
  featured,
  maxFeatured,
  onToggleFeatured,
  onRemove,
  ensureFeatured,
}: {
  friends: Friend[];
  featured: string[];
  maxFeatured: number;
  onToggleFeatured: (id: string) => void;
  onRemove: (id: string) => void;
  ensureFeatured: () => void;
}) {
  // tampilkan featured terlebih dahulu
  const sorted = useMemo(() => {
    return [...friends].sort((a, b) => {
      const af = featured.includes(a.id) ? 0 : 1;
      const bf = featured.includes(b.id) ? 0 : 1;
      return af - bf || b.since - a.since;
    });
  }, [friends, featured]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-leaf/30 bg-leaf/5 p-3">
        <Star className="size-4 shrink-0 text-leaf" />
        <p className="text-xs text-muted-foreground">
          Pilih hingga <span className="font-bold text-foreground">{maxFeatured} teman</span> untuk
          tampil berjalan-jalan di Home. Terpilih:{" "}
          <span className="font-bold text-leaf">{featured.length}</span>/{maxFeatured}
        </p>
      </div>

      {friends.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum punya teman"
          description="Cari teman lewat tab Cari Teman."
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((f) => {
            const isFeatured = featured.includes(f.id);
            const canFeature = isFeatured || featured.length < maxFeatured;
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft"
              >
                <Avatar initials={f.initials} hue={f.hue} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.accountId} · sejak{" "}
                    {new Date(f.since).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (canFeature) onToggleFeatured(f.id);
                    else ensureFeatured();
                  }}
                  disabled={!canFeature}
                  aria-label={isFeatured ? "Keluarkan dari Teman Tampil" : "Jadikan Teman Tampil"}
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                    isFeatured
                      ? "bg-leaf/15 text-leaf"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  }`}
                >
                  <Star className={`size-4 ${isFeatured ? "fill-current" : ""}`} />
                  {isFeatured ? "Tampil" : "Pilih"}
                </button>
                <button
                  onClick={() => onRemove(f.id)}
                  aria-label="Hapus teman"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------- Shared UI ------------------------- */

function Avatar({
  initials,
  hue,
  size = "md",
}: {
  initials: string;
  hue: number;
  size?: "sm" | "md" | "lg";
}) {
  const sz =
    size === "lg" ? "size-16 text-lg" : size === "sm" ? "size-9 text-xs" : "size-11 text-sm";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-primary-foreground shadow-soft ${sz}`}
      style={{
        backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${hue}), oklch(0.66 0.13 ${hue + 25}))`,
      }}
    >
      {initials}
    </span>
  );
}
