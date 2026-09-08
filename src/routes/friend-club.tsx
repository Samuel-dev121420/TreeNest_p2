import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  Clock,
  X,
  Trash2,
  Star,
  Check,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { PublicProfileModal } from "@/components/PublicProfileModal";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useScrollLock } from "@/hooks/use-scroll-lock";
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
  subscribeToIncomingFriendRequests,
  subscribeToSentFriendRequests,
  subscribeToUserFriends,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getUserFriends,
  removeFriendship,
  getFeaturedFriends,
  updateFeaturedFriends,
  type UserProfile,
} from "@/lib/firestore-service";
import {
  getIncomingContacts,
  deleteChatConversation,
  deleteAllIncomingContacts,
  type IncomingContact,
} from "@/lib/chat-service";
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

type Tab = "search" | "requests" | "incoming_contacts" | "list";

function FriendClubPage() {
  const location = useLocation();
  const { profile, refreshProfile } = useAuth();
  const uid = profile?.uid ?? "guest";

  const initialTab = useMemo(() => {
    const searchObj = location.search as { tab?: Tab };
    return searchObj?.tab &&
      ["search", "requests", "incoming_contacts", "list"].includes(searchObj.tab)
      ? searchObj.tab
      : "search";
  }, [location.search]);

  const initialSearchQuery = useMemo(() => {
    const searchObj = location.search as { q?: string };
    return searchObj?.q || "";
  }, [location.search]);

  // Clean up any residual search query storage on mount and unmount
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("treenest_friend_search_q");
    }
    return () => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("treenest_friend_search_q");
      }
    };
  }, []);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<SentRequest[]>([]);
  const [incomingContacts, setIncomingContacts] = useState<IncomingContact[]>([]);
  const [featured, setFeatured] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [viewingAccountId, setViewingAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals konfirmasi
  const [confirmDeleteFriend, setConfirmDeleteFriend] = useState<Friend | null>(null);
  const [confirmFeaturedAction, setConfirmFeaturedAction] = useState<{
    friend: Friend;
    action: "add" | "remove";
  } | null>(null);
  const [confirmDeleteContact, setConfirmDeleteContact] = useState<IncomingContact | null>(null);
  const [confirmDeleteAllContacts, setConfirmDeleteAllContacts] = useState(false);

  useScrollLock(
    Boolean(
      viewingAccountId ||
        confirmDeleteFriend ||
        confirmFeaturedAction ||
        confirmDeleteContact ||
        confirmDeleteAllContacts,
    ),
  );

  // Load all social data from Firestore / storage for this specific user
  const loadSocialData = useCallback(async () => {
    if (!uid || uid === "guest") {
      setLoading(false);
      return;
    }
    try {
      const fList = await getUserFriends(uid, profile?.accountId);
      const friendKeys = new Set<string>(
        fList.flatMap((f) => [f.accountId?.toUpperCase(), f.id, f.uid].filter(Boolean) as string[])
      );

      const [inReqs, outReqs, featList, inContacts] = await Promise.all([
        getIncomingFriendRequests(uid, profile?.accountId, fList),
        getSentFriendRequests(uid, profile?.accountId, fList),
        getFeaturedFriends(uid),
        getIncomingContacts(uid, friendKeys),
      ]);
      const validFeat = featList.filter((fid) =>
        fList.some((f) => f.id === fid || f.accountId?.toUpperCase() === fid?.toUpperCase()),
      );
      if (validFeat.length !== featList.length) {
        updateFeaturedFriends(uid, validFeat).catch(() => {});
      }

      // Pastikan request masuk dan terkirim sama sekali tidak menampilkan user yang sudah resmi berteman
      const cleanInReqs = inReqs.filter(
        (r) =>
          !fList.some(
            (f) =>
              f.accountId?.toUpperCase() === r.from.accountId?.toUpperCase() ||
              (r.from.uid && f.uid === r.from.uid),
          ),
      );
      const cleanOutReqs = outReqs.filter(
        (s) =>
          !fList.some(
            (f) =>
              f.accountId?.toUpperCase() === s.to.accountId?.toUpperCase() ||
              (s.to.uid && f.uid === s.to.uid),
          ),
      );

      setFriends(fList);
      setRequests(cleanInReqs);
      setSent(cleanOutReqs);
      setIncomingContacts(inContacts);
      setFeatured(validFeat);
    } catch (err) {
      console.error("Error loading social data:", err);
    } finally {
      setLoading(false);
    }
  }, [uid, profile?.accountId]);

  useEffect(() => {
    if (!uid || uid === "guest") {
      setLoading(false);
      return;
    }

    // Subscribe realtime to friends list
    const unsubFriends = subscribeToUserFriends(uid, profile?.accountId, (fList) => {
      setFriends(fList);
      setLoading(false);
    });

    // Subscribe realtime to incoming friend requests
    const unsubIncoming = subscribeToIncomingFriendRequests(uid, profile?.accountId, (inReqs) => {
      setRequests(inReqs);
    });

    // Subscribe realtime to sent friend requests
    const unsubSent = subscribeToSentFriendRequests(uid, profile?.accountId, (outReqs) => {
      setSent(outReqs);
    });

    loadSocialData();

    return () => {
      unsubFriends();
      unsubIncoming();
      unsubSent();
    };
  }, [uid, profile?.accountId, loadSocialData]);

  const pendingIn = useMemo(() => {
    const friendAccountIds = new Set(friends.map((f) => f.accountId?.toUpperCase()));
    const friendUids = new Set(friends.map((f) => f.uid));
    return requests.filter(
      (r) =>
        r.status === "pending" &&
        !friendAccountIds.has(r.from?.accountId?.toUpperCase()) &&
        !friendUids.has(r.from?.uid),
    );
  }, [requests, friends]);

  const pendingOut = useMemo(() => {
    const friendAccountIds = new Set(friends.map((f) => f.accountId?.toUpperCase()));
    const friendUids = new Set(friends.map((f) => f.uid));
    return sent.filter(
      (s) =>
        s.status === "pending" &&
        !friendAccountIds.has(s.to?.accountId?.toUpperCase()) &&
        !friendUids.has(s.to?.uid),
    );
  }, [sent, friends]);

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
    const updatedFriendsCount = friends.length + 1;
    setViewedFriendsCount(updatedFriendsCount);
    handleSelectTab("list");
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
  const [viewedContactsCount, setViewedContactsCount] = useLocalStorage<number>(
    `treenest.friend.viewed_contacts.${uid}`,
    0,
  );
  const [viewedFriendsCount, setViewedFriendsCount] = useLocalStorage<number>(
    `treenest.friend.viewed_friends.${uid}`,
    0,
  );

  const hasNewRequests = pendingIn.length > 0 && pendingIn.length > viewedRequestsCount;
  const hasNewContacts =
    incomingContacts.length > 0 && incomingContacts.length > viewedContactsCount;
  const hasNewFriends = friends.length > 0 && friends.length > viewedFriendsCount;

  // Trigger global notifications for incoming requests, contacts & new friends
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
    if (hasNewContacts) {
      import("@/lib/notification-service").then(({ addNotification }) => {
        addNotification({
          type: "chat_received",
          title: "Kontak Masuk Baru",
          message: "Kamu menerima pesan percakapan baru di Kontak Masuk.",
          link: "/friend-club?tab=incoming_contacts",
          targetUid: uid,
        });
      });
    }
  }, [hasNewContacts, uid]);

  useEffect(() => {
    if (hasNewFriends) {
      import("@/lib/notification-service").then(({ addNotification }) => {
        addNotification({
          type: "friend_accepted",
          title: "Teman Baru Terhubung!",
          message: "Kamu memiliki teman baru yang sudah resmi berteman.",
          link: "/friend-club?tab=list",
          targetUid: uid,
        });
      });
    }
  }, [hasNewFriends, uid]);

  function handleSelectTab(t: Tab) {
    setTab(t);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", t);
      window.history.replaceState({}, "", url.toString());
    }
    if (t === "requests") {
      setViewedRequestsCount(pendingIn.length);
    } else if (t === "incoming_contacts") {
      setViewedContactsCount(incomingContacts.length);
    } else if (t === "list") {
      setViewedFriendsCount(friends.length);
    }
  }

  const tabs: { key: Tab; label: string; badge?: number; showRedDot?: boolean }[] = [
    { key: "search", label: "Cari Teman" },
    { key: "requests", label: "Informasi Lanjut", badge: pendingIn.length, showRedDot: hasNewRequests },
    {
      key: "incoming_contacts",
      label: "Kontak Masuk",
      badge: incomingContacts.length,
      showRedDot: hasNewContacts,
    },
    { key: "list", label: "Daftar Teman", showRedDot: hasNewFriends },
  ];

  return (
    <PageShell
      title="Friend Club"
      description="Cari Teman, Kelola Permintaan, Kontak Masuk, dan Atur Teman."
    >
      {/* Tab Selector */}
      <div className="mb-6 flex gap-1.5 sm:gap-2 rounded-3xl border border-border/70 bg-card p-1.5 shadow-soft transition-all duration-300">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleSelectTab(t.key)}
            className={`relative flex flex-1 items-center justify-center gap-1 sm:gap-1.5 rounded-2xl px-2 sm:px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
              tab === t.key
                ? "bg-primary text-primary-foreground shadow-soft scale-[1.02]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span className="truncate">{t.label}</span>
            {t.badge ? (
              <span
                className={`flex size-4 sm:size-5 shrink-0 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-bold ${
                  tab === t.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {t.badge}
              </span>
            ) : null}
            {t.showRedDot && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {tab === "search" && (
            <SearchPanel
              friends={friends}
              sent={sent}
              onSend={handleSendRequest}
              goList={() => handleSelectTab("list")}
              onViewProfile={setViewingAccountId}
              initialQuery={initialSearchQuery}
            />
          )}

          {tab === "requests" && (
            <RequestsPanel
              pendingIn={pendingIn}
              pendingOut={pendingOut}
              onAccept={handleAcceptRequest}
              onReject={handleRejectRequest}
              onCancel={handleCancelSent}
              onViewProfile={setViewingAccountId}
            />
          )}

          {tab === "incoming_contacts" && (
            <IncomingContactsPanel
              contacts={incomingContacts}
              onDelete={(c) => setConfirmDeleteContact(c)}
              onDeleteAll={() => setConfirmDeleteAllContacts(true)}
              onViewProfile={setViewingAccountId}
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
        </motion.div>
      </AnimatePresence>

      {/* Modal Konfirmasi Hapus 1 Kontak Masuk */}
      <AnimatePresence>
        {confirmDeleteContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
            onClick={() => setConfirmDeleteContact(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
              className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6 shadow-float text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex size-14 items-center justify-center rounded-3xl bg-destructive/15 text-destructive mx-auto shadow-inner">
                <Trash2 className="size-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Hapus Riwayat Kontak Masuk?
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Apakah kamu yakin ingin menghapus riwayat kontak masuk dari{" "}
                  <strong>{confirmDeleteContact.user.username}</strong> (
                  {confirmDeleteContact.user.accountId})?
                </p>
                <p className="mt-2 text-[11px] text-destructive font-medium bg-destructive/10 rounded-xl py-1.5 px-2">
                  Riwayat pesan dengan akun ini akan dibersihkan.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteContact(null)}
                  className="flex-1 rounded-2xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const c = confirmDeleteContact;
                    setConfirmDeleteContact(null);
                    await deleteChatConversation(c.roomId);
                    await loadSocialData();
                  }}
                  className="flex-1 rounded-2xl bg-destructive py-2.5 text-xs font-bold text-white hover:bg-destructive/90 transition-colors shadow-soft cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Hapus Semua Kontak Masuk */}
      <AnimatePresence>
        {confirmDeleteAllContacts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
            onClick={() => setConfirmDeleteAllContacts(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
              className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6 shadow-float text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex size-14 items-center justify-center rounded-3xl bg-destructive/15 text-destructive mx-auto shadow-inner">
                <Trash2 className="size-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Hapus Semua Kontak Masuk?</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Apakah kamu yakin ingin menghapus seluruh ({incomingContacts.length}) riwayat kontak masuk dari akun yang belum berteman?
                </p>
                <p className="mt-2 text-[11px] text-destructive font-medium bg-destructive/10 rounded-xl py-1.5 px-2">
                  Tindakan ini akan menghapus semua pesan percakapan non-teman secara permanen.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAllContacts(false)}
                  className="flex-1 rounded-2xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmDeleteAllContacts(false);
                    await deleteAllIncomingContacts(incomingContacts.map((c) => c.roomId));
                    await loadSocialData();
                  }}
                  className="flex-1 rounded-2xl bg-destructive py-2.5 text-xs font-bold text-white hover:bg-destructive/90 transition-colors shadow-soft cursor-pointer"
                >
                  Ya, Hapus Semua
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Hapus Teman */}
      <AnimatePresence>
        {confirmDeleteFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
            onClick={() => setConfirmDeleteFriend(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
              className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6 shadow-float text-center space-y-4"
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
                  className="flex-1 rounded-2xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => executeRemoveFriend(confirmDeleteFriend)}
                  className="flex-1 rounded-2xl bg-destructive py-2.5 text-xs font-bold text-white hover:bg-destructive/90 transition-colors shadow-soft cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Teman Tampil */}
      <AnimatePresence>
        {confirmFeaturedAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
            onClick={() => setConfirmFeaturedAction(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
              className="w-full max-w-md rounded-3xl border border-leaf/30 bg-card p-6 shadow-float text-center space-y-4"
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
                  className="flex-1 rounded-2xl border border-border/80 bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => executeToggleFeatured(confirmFeaturedAction.friend, confirmFeaturedAction.action)}
                  className="flex-1 rounded-2xl bg-leaf py-2.5 text-xs font-bold text-white hover:bg-leaf/90 transition-colors shadow-soft cursor-pointer"
                >
                  {confirmFeaturedAction.action === "add" ? "Ya, Tampilkan" : "Ya, Keluarkan"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
  initialQuery = "",
}: {
  friends: Friend[];
  sent: SentRequest[];
  onSend: (p: Person) => void;
  goList: () => void;
  onViewProfile: (accountId: string) => void;
  initialQuery?: string;
}) {
  const { profile } = useAuth();
  const [query, setQuery] = useState(initialQuery || "");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (initialQuery !== undefined && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (val.trim()) {
        url.searchParams.set("q", val);
      } else {
        url.searchParams.delete("q");
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

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
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Cari berdasarkan Nama atau ID Akun..."
          className="w-full rounded-2xl border border-input bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground py-3 pl-10 pr-10 text-sm font-medium shadow-soft focus:border-primary focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => handleQueryChange("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
            title="Hapus pencarian"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
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
  onViewProfile,
}: {
  pendingIn: FriendRequest[];
  pendingOut: SentRequest[];
  onAccept: (r: FriendRequest) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onViewProfile: (accountId: string) => void;
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
                onClick={() => onViewProfile(r.from.accountId)}
                className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProfile(r.from.accountId);
                  }}
                  className="shrink-0 cursor-pointer"
                  title="Lihat profil"
                >
                  <Avatar
                    initials={r.from.initials}
                    hue={r.from.hue}
                    avatarUrl={r.from.avatarUrl}
                    size="md"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground group-hover:underline">
                    {r.from.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.from.accountId}</p>
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onAccept(r)}
                    aria-label="Terima permintaan"
                    className="flex items-center gap-1 rounded-xl bg-leaf px-3 py-2 text-xs font-bold text-white shadow-soft transition-colors hover:bg-leaf/90 cursor-pointer active:scale-95"
                  >
                    <Check className="size-3.5" /> Terima
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(r.id)}
                    aria-label="Tolak permintaan"
                    className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer active:scale-95"
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
                onClick={() => onViewProfile(s.to.accountId)}
                className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProfile(s.to.accountId);
                  }}
                  className="shrink-0 cursor-pointer"
                  title="Lihat profil"
                >
                  <Avatar initials={s.to.initials} hue={s.to.hue} avatarUrl={s.to.avatarUrl} size="md" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground group-hover:underline">
                    {s.to.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.to.accountId} · Menunggu konfirmasi</p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onCancel(s.id)}
                    className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70 cursor-pointer active:scale-95"
                  >
                    <X className="size-4" /> Batalkan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* -------------------- Kontak Masuk ------------------------- */

function IncomingContactsPanel({
  contacts,
  onDelete,
  onDeleteAll,
  onViewProfile,
}: {
  contacts: IncomingContact[];
  onDelete: (contact: IncomingContact) => void;
  onDeleteAll: () => void;
  onViewProfile: (accountId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleContacts = showAll ? contacts : contacts.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Kontak Masuk ({contacts.length})
        </h2>
        {contacts.length > 0 && (
          <button
            type="button"
            onClick={onDeleteAll}
            className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive transition-all hover:bg-destructive hover:text-white cursor-pointer active:scale-95 shadow-xs"
            title="Hapus semua riwayat kontak masuk"
          >
            <Trash2 className="size-3.5" />
            <span>Hapus Semua</span>
          </button>
        )}
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Belum ada kontak masuk"
          description="Pesan masuk dari pengguna yang belum berteman resmi akan tampil di sini."
        />
      ) : (
        <div className="space-y-2">
          {visibleContacts.map((c) => (
            <div
              key={c.roomId}
              onClick={() => onViewProfile(c.user.accountId)}
              className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft transition-all hover:border-primary/50 hover:shadow-md cursor-pointer select-none"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile(c.user.accountId);
                }}
                className="relative shrink-0 cursor-pointer"
                title="Lihat profil"
              >
                <Avatar
                  initials={c.user.initials || c.user.username.slice(0, 2).toUpperCase()}
                  hue={c.user.hue}
                  avatarUrl={c.user.avatarUrl}
                  size="md"
                />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-foreground group-hover:underline">
                    {c.user.username}
                  </p>
                  <span className="text-[10px] font-semibold text-muted-foreground/80">
                    {c.user.accountId}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground/80">{c.user.username}</span>{" "}
                  mengirim <span className="font-bold text-primary">{c.totalMessages}</span> pesan
                </p>
              </div>

              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onDelete(c)}
                  title="Hapus riwayat kontak"
                  aria-label="Hapus riwayat kontak"
                  className="rounded-xl p-2.5 text-muted-foreground transition-all hover:bg-destructive/15 hover:text-destructive active:scale-90 cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Tombol Show More jika lebih dari 5 kontak */}
          {contacts.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border/80 bg-secondary/60 py-2.5 text-xs font-bold text-foreground hover:bg-secondary hover:border-primary/40 transition-all shadow-xs cursor-pointer active:scale-98"
            >
              {showAll ? (
                <>
                  <ChevronUp className="size-4 text-primary" />
                  <span>Sembunyikan</span>
                </>
              ) : (
                <>
                  <ChevronDown className="size-4 text-primary" />
                  <span>
                    Tampilkan Lebih Banyak ({contacts.length - 5} kontak lainnya)
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}
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
                    {(() => {
                      const diffMs = Math.max(0, Date.now() - (f.since || Date.now()));
                      const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                      return `${f.accountId} · Sudah berteman ${diffDays} hari`;
                    })()}
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
