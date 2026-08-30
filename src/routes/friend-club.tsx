import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Users, Search, UserPlus, UserCheck, Clock, X, Trash2, Star, Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { PublicProfileModal } from "@/components/PublicProfileModal";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  MAX_FEATURED,
  type Friend,
  type FriendRequest,
  type Person,
  type SentRequest,
} from "@/lib/social";
import {
  searchUsers,
  sendFriendRequest,
  getIncomingFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getUserFriends,
  removeFriendship,
  getFeaturedFriends,
  updateFeaturedFriends,
  type UserProfile,
} from "@/lib/firestore-service";
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

type Tab = "search" | "requests" | "list";

function FriendClubPage() {
  const { profile, refreshProfile } = useAuth();
  const uid = profile?.uid ?? "guest";

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<SentRequest[]>([]);
  const [featured, setFeatured] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("search");
  const [viewingAccountId, setViewingAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals konfirmasi
  const [confirmDeleteFriend, setConfirmDeleteFriend] = useState<Friend | null>(null);
  const [confirmFeaturedAction, setConfirmFeaturedAction] = useState<{
    friend: Friend;
    action: "add" | "remove";
  } | null>(null);

  // Load all social data from Firestore / storage for this specific user
  const loadSocialData = useCallback(async () => {
    if (!uid || uid === "guest") {
      setLoading(false);
      return;
    }
    try {
      const [fList, inReqs, outReqs, featList] = await Promise.all([
        getUserFriends(uid, profile?.accountId),
        getIncomingFriendRequests(uid, profile?.accountId),
        getSentFriendRequests(uid, profile?.accountId),
        getFeaturedFriends(uid),
      ]);
      const validFeat = featList.filter((fid) =>
        fList.some((f) => f.id === fid || f.accountId === fid),
      );
      if (validFeat.length !== featList.length) {
        updateFeaturedFriends(uid, validFeat).catch(() => {});
      }

      setFriends(fList);
      setRequests(inReqs);
      setSent(outReqs);
      setFeatured(validFeat);
    } catch (err) {
      console.error("Error loading social data:", err);
    } finally {
      setLoading(false);
    }
  }, [uid, profile?.accountId]);

  useEffect(() => {
    loadSocialData();
  }, [loadSocialData]);

  const pendingIn = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
  const pendingOut = useMemo(() => sent.filter((s) => s.status === "pending"), [sent]);

  async function handleSendRequest(person: Person) {
    if (!profile) return;
    if (friends.some((f) => f.accountId === person.accountId)) return;
    if (sent.some((s) => s.to.accountId === person.accountId)) return;

    const fromUser = {
      uid: profile.uid,
      accountId: profile.accountId,
      name: profile.username,
      initials: profile.initials,
      hue: profile.hue,
      avatarUrl: profile.avatarUrl,
    };

    const res = await sendFriendRequest(fromUser, person);
    if (res.success) {
      await loadSocialData();
    }
  }

  async function handleAcceptRequest(req: FriendRequest) {
    if (!profile) return;
    const currentUser = {
      uid: profile.uid,
      accountId: profile.accountId,
      name: profile.username,
      initials: profile.initials,
      hue: profile.hue,
      avatarUrl: profile.avatarUrl,
    };

    await acceptFriendRequest(req.id, currentUser, req.from);
    if (uid !== "guest") {
      await awardActivityExp(uid, "add_friend", req.from.accountId);
      await refreshProfile();
    }

    // Auto-feature teman baru jika kuota teman tampil masih ada (< 5)
    try {
      const currentFeat = await getFeaturedFriends(uid);
      const friendKey = req.from.uid || req.from.accountId;
      if (
        currentFeat.length < MAX_FEATURED &&
        !currentFeat.includes(friendKey) &&
        !currentFeat.includes(req.from.accountId)
      ) {
        const nextFeat = [...currentFeat, friendKey];
        await updateFeaturedFriends(uid, nextFeat);
      }
    } catch {
      // ignore
    }

    await loadSocialData();
    setTab("list");
  }

  async function handleRejectRequest(id: string) {
    await rejectFriendRequest(id);
    await loadSocialData();
  }

  async function handleCancelSent(id: string) {
    await cancelFriendRequest(id);
    await loadSocialData();
  }

  function handleRequestRemoveFriend(friend: Friend) {
    setConfirmDeleteFriend(friend);
  }

  async function executeRemoveFriend(friend: Friend) {
    setConfirmDeleteFriend(null);
    await removeFriendship(uid, friend.accountId, friend.uid);
    const updatedFeat = featured.filter((fid) => fid !== friend.id && fid !== friend.accountId);
    setFeatured(updatedFeat);
    await updateFeaturedFriends(uid, updatedFeat);
    await loadSocialData();
    await refreshProfile();
  }

  function handleRequestToggleFeatured(friend: Friend) {
    const friendKey = friend.id || friend.accountId;
    const isFeatured = featured.includes(friend.id) || featured.includes(friend.accountId);
    if (!isFeatured && featured.length >= MAX_FEATURED) return;
    setConfirmFeaturedAction({
      friend,
      action: isFeatured ? "remove" : "add",
    });
  }

  async function executeToggleFeatured(friend: Friend, action: "add" | "remove") {
    setConfirmFeaturedAction(null);
    const friendKey = friend.id || friend.accountId;
    let updated: string[];
    if (action === "remove") {
      updated = featured.filter((fid) => fid !== friend.id && fid !== friend.accountId);
    } else {
      if (featured.length >= MAX_FEATURED) return;
      updated = [...featured, friendKey];
    }
    setFeatured(updated);
    await updateFeaturedFriends(uid, updated);
  }

  // Track viewed states for red dot notifications
  const [viewedRequestsCount, setViewedRequestsCount] = useLocalStorage<number>(
    `treenest.friend.viewed_requests.${uid}`,
    0,
  );
  const [viewedFriendsCount, setViewedFriendsCount] = useLocalStorage<number>(
    `treenest.friend.viewed_friends.${uid}`,
    0,
  );

  const hasNewRequests = pendingIn.length > 0 && pendingIn.length > viewedRequestsCount;
  const hasNewFriends = friends.length > 0 && friends.length > viewedFriendsCount;

  // Trigger global notifications for incoming requests & new friends
  useEffect(() => {
    if (pendingIn.length > 0) {
      pendingIn.forEach((req) => {
        import("@/lib/notification-service").then(({ addNotification }) => {
          addNotification({
            type: "friend_request_received",
            title: "Permintaan Pertemanan",
            message: `${req.from.name || "Seseorang"} menyukai profilmu dan mengirim permintaan pertemanan.`,
            link: "/friend-club?tab=requests",
            targetUid: uid,
          });
        });
      });
    }
  }, [pendingIn, uid]);

  useEffect(() => {
    if (hasNewFriends) {
      import("@/lib/notification-service").then(({ addNotification }) => {
        addNotification({
          type: "friend_accepted",
          title: "Teman Baru Terhubung! 🎉",
          message: "Kamu memiliki teman baru yang sudah resmi berteman.",
          link: "/friend-club?tab=list",
          targetUid: uid,
        });
      });
    }
  }, [hasNewFriends, uid]);

  function handleSelectTab(t: Tab) {
    setTab(t);
    if (t === "requests") {
      setViewedRequestsCount(pendingIn.length);
    } else if (t === "list") {
      setViewedFriendsCount(friends.length);
    }
  }

  const tabs: { key: Tab; label: string; badge?: number; showRedDot?: boolean }[] = [
    { key: "search", label: "Cari Teman" },
    { key: "requests", label: "Permintaan", badge: pendingIn.length, showRedDot: hasNewRequests },
    { key: "list", label: "Daftar Teman", showRedDot: hasNewFriends },
  ];

  return (
    <PageShell
      title="Friend Club"
      description="Cari Teman, Kelola Permintaan, dan Atur Teman."
    >
      {/* Tab Selector */}
      <div className="mb-6 flex gap-2 rounded-3xl border border-border/70 bg-card p-1.5 shadow-soft transition-all duration-300">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleSelectTab(t.key)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
              tab === t.key
                ? "bg-primary text-primary-foreground shadow-soft scale-[1.02]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
            {t.showRedDot && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <SearchPanel
          friends={friends}
          sent={sent}
          onSend={handleSendRequest}
          goList={() => setTab("list")}
          onViewProfile={setViewingAccountId}
        />
      )}

      {tab === "requests" && (
        <RequestsPanel
          pendingIn={pendingIn}
          pendingOut={pendingOut}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
          onCancel={handleCancelSent}
        />
      )}

      {tab === "list" && (
        <ListPanel
          friends={friends}
          featured={featured}
          maxFeatured={MAX_FEATURED}
          onToggleFeatured={handleRequestToggleFeatured}
          onRemove={handleRequestRemoveFriend}
          onViewProfile={setViewingAccountId}
        />
      )}

      {/* Modal Konfirmasi Hapus Teman */}
      {confirmDeleteFriend && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setConfirmDeleteFriend(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-destructive/30 bg-card p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex size-14 items-center justify-center rounded-3xl bg-destructive/15 text-destructive mx-auto shadow-inner">
              <Trash2 className="size-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Hapus Hubungan Pertemanan?</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Apakah kamu yakin ingin menghapus <strong>{confirmDeleteFriend.name}</strong> ({confirmDeleteFriend.accountId}) dari daftar temanmu?
              </p>
              <p className="mt-2 text-[11px] text-destructive font-medium bg-destructive/10 rounded-xl py-1.5 px-2">
                Tindakan ini akan menghapus pertemanan di kedua akun secara permanen.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteFriend(null)}
                className="flex-1 rounded-2xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/70 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeRemoveFriend(confirmDeleteFriend)}
                className="flex-1 rounded-2xl bg-destructive py-2.5 text-xs font-bold text-white hover:bg-destructive/90 transition-colors shadow-soft"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Teman Tampil */}
      {confirmFeaturedAction && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setConfirmFeaturedAction(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-leaf/30 bg-card p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex size-14 items-center justify-center rounded-3xl bg-leaf/15 text-leaf mx-auto shadow-inner">
              <Star className="size-7 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {confirmFeaturedAction.action === "add"
                  ? "Jadikan Teman Tampil?"
                  : "Keluarkan dari Teman Tampil?"}
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {confirmFeaturedAction.action === "add" ? (
                  <>
                    Tampilkan bola profil <strong>{confirmFeaturedAction.friend.name}</strong> untuk ikut berjalan-jalan di Home Page pohonmu? (Maksimal {MAX_FEATURED} teman tampil)
                  </>
                ) : (
                  <>
                    Keluarkan <strong>{confirmFeaturedAction.friend.name}</strong> dari daftar teman yang tampil di Home Page?
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmFeaturedAction(null)}
                className="flex-1 rounded-2xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/70 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeToggleFeatured(confirmFeaturedAction.friend, confirmFeaturedAction.action)}
                className="flex-1 rounded-2xl bg-leaf py-2.5 text-xs font-bold text-white hover:bg-leaf/90 transition-colors shadow-soft"
              >
                {confirmFeaturedAction.action === "add" ? "Ya, Tampilkan" : "Ya, Keluarkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingAccountId && (
        <PublicProfileModal
          accountId={viewingAccountId}
          viewerUid={uid}
          viewerFriends={friends}
          isFriend={friends.some((f) => f.accountId === viewingAccountId || f.id === viewingAccountId)}
          isRequestSent={sent.some(
            (s) => s.status === "pending" && (s.to.accountId === viewingAccountId || s.to.uid === viewingAccountId)
          )}
          onClose={() => setViewingAccountId(null)}
          onAddFriend={(person) => {
            if (person) {
              handleSendRequest(person);
            }
          }}
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
  onViewProfile,
}: {
  friends: Friend[];
  sent: SentRequest[];
  onSend: (p: Person) => void;
  goList: () => void;
  onViewProfile: (accountId: string) => void;
}) {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const list = await searchUsers(term, profile?.uid);
        setResults(list);
      } catch (err) {
        console.error("Error searching users:", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, profile?.uid]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari berdasarkan Nama atau ID Akun..."
          className="w-full rounded-2xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground py-3 pl-10 pr-4 text-sm font-medium shadow-soft focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {!query.trim() ? (
          <div className="sm:col-span-2">
            <EmptyState
              icon={Search}
              title="Cari Teman Baru"
              description="Ketik nama pengguna atau ID Akun untuk menemukan teman di TreeNest."
            />
          </div>
        ) : isSearching ? (
          <div className="sm:col-span-2 text-center py-8 text-xs text-muted-foreground font-semibold">
            Mencari teman...
          </div>
        ) : results.length === 0 ? (
          <div className="sm:col-span-2">
            <EmptyState
              icon={Search}
              title="Tidak ditemukan"
              description="Pengguna dengan nama atau ID Akun tersebut tidak ditemukan."
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
                <button
                  onClick={() => onViewProfile(u.accountId)}
                  className="shrink-0"
                  title="Lihat profil"
                >
                  <Avatar initials={u.initials} hue={u.hue} avatarUrl={u.avatarUrl} size="md" />
                </button>
                <button
                  onClick={() => onViewProfile(u.accountId)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-bold text-foreground hover:underline">{u.username}</p>
                  <p className="text-xs text-muted-foreground">{u.accountId}</p>
                </button>
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
                    onClick={() => onSend({
                      uid: u.uid,
                      accountId: u.accountId,
                      name: u.username,
                      initials: u.initials,
                      hue: u.hue,
                      avatarUrl: u.avatarUrl
                    })}
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
          Permintaan Masuk ({pendingIn.length})
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
                <Avatar
                  initials={r.from.initials}
                  hue={r.from.hue}
                  avatarUrl={r.from.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{r.from.name}</p>
                  <p className="text-xs text-muted-foreground">{r.from.accountId}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onAccept(r)}
                    aria-label="Terima permintaan"
                    className="flex items-center gap-1 rounded-xl bg-leaf px-3 py-2 text-xs font-bold text-white shadow-soft transition-colors hover:bg-leaf/90"
                  >
                    <Check className="size-3.5" /> Terima
                  </button>
                  <button
                    onClick={() => onReject(r.id)}
                    aria-label="Tolak permintaan"
                    className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" /> Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Terkirim ({pendingOut.length})
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
                <Avatar initials={s.to.initials} hue={s.to.hue} avatarUrl={s.to.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{s.to.name}</p>
                  <p className="text-xs text-muted-foreground">{s.to.accountId} · Menunggu konfirmasi</p>
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
  onViewProfile,
}: {
  friends: Friend[];
  featured: string[];
  maxFeatured: number;
  onToggleFeatured: (friend: Friend) => void;
  onRemove: (friend: Friend) => void;
  onViewProfile: (accountId: string) => void;
}) {
  // Hanya hitung dan tampilkan teman yang benar-benar aktif berteman
  const validFeatured = useMemo(() => {
    return featured.filter((fid) => friends.some((f) => f.id === fid || f.accountId === fid));
  }, [featured, friends]);

  // tampilkan featured terlebih dahulu
  const sorted = useMemo(() => {
    return [...friends].sort((a, b) => {
      const af = validFeatured.includes(a.id) || validFeatured.includes(a.accountId) ? 0 : 1;
      const bf = validFeatured.includes(b.id) || validFeatured.includes(b.accountId) ? 0 : 1;
      return af - bf || b.since - a.since;
    });
  }, [friends, validFeatured]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft">
        <Star className="size-4 shrink-0 text-leaf" />
        <p className="text-xs text-muted-foreground">
          Pilih hingga <span className="font-bold text-foreground">{maxFeatured} teman</span> untuk
          tampil berjalan-jalan di Home. Terpilih:{" "}
          <span className="font-bold text-leaf">{validFeatured.length}</span>/{maxFeatured}
        </p>
      </div>

      {friends.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum punya teman"
          description="Cari teman lewat tab Cari Teman untuk mulai terhubung."
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((f) => {
            const isFeatured = validFeatured.includes(f.id) || validFeatured.includes(f.accountId);
            const canFeature = isFeatured || validFeatured.length < maxFeatured;
            return (
              <div
                key={f.id || f.accountId}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft"
              >
                <button
                  onClick={() => onViewProfile(f.accountId)}
                  className="shrink-0"
                  title="Lihat profil"
                >
                  <Avatar initials={f.initials} hue={f.hue} avatarUrl={f.avatarUrl} size="md" />
                </button>
                <button
                  onClick={() => onViewProfile(f.accountId)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-bold text-foreground hover:underline">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.accountId} · sejak{" "}
                    {new Date(f.since).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </button>
                <button
                  onClick={() => onToggleFeatured(f)}
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
                  onClick={() => onRemove(f)}
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
  avatarUrl,
  size = "md",
}: {
  initials: string;
  hue: number;
  avatarUrl?: string | undefined;
  size?: ("sm" | "md" | "lg") | undefined;
}) {
  const sz =
    size === "lg" ? "size-16 text-lg" : size === "sm" ? "size-9 text-xs" : "size-11 text-sm";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={initials}
        className={`shrink-0 rounded-full object-cover shadow-soft ring-2 ring-card/60 ${sz}`}
      />
    );
  }

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
