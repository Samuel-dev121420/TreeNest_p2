import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import {
  getUserFriends,
  getSentFriendRequests,
  sendFriendRequest,
  isUserOnline,
  type UserProfile,
} from "@/lib/firestore-service";
import type { Friend, SentRequest, Person } from "@/lib/social";
import {
  getOrCreateChatRoom,
  subscribeToMessages,
  sendMessage,
  editMessage,
  setTypingStatus,
  subscribeToTypingStatus,
  deleteSingleMessage,
  deleteMultipleMessages,
  clearAllChatHistory,
  toggleMessageReaction,
  markMessagesAsRead,
  markMessagesAsDelivered,
  type ChatMessage,
} from "@/lib/chat-service";
import {
  ArrowLeft,
  Send,
  Smile as SmileIcon,
  Trash2,
  Reply,
  MoreHorizontal,
  CheckSquare,
  Check,
  CheckCheck,
  Clock,
  Ban,
  Copy,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  User,
  Users,
  Loader2,
} from "lucide-react";
import { PublicProfileModal } from "@/components/PublicProfileModal";
import { TikTokEmotePicker, renderMessageWithEmotes, isMessageOnlyEmojis } from "@/components/chat/TikTokEmotes";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { id } from "date-fns/locale";

export const Route = createFileRoute("/chat/$accountId")({
  component: ChatPage,
});

function ChatPage() {
  const { accountId } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuth();

  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [viewerFriends, setViewerFriends] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [activeProfileAccountId, setActiveProfileAccountId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomIdRef = useRef<string | null>(null);
  const userRef = useRef(user);
  userRef.current = user;
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emoteButtonRef = useRef<HTMLButtonElement>(null);
  const [isTextareaOverflowing, setIsTextareaOverflowing] = useState(false);
  const [isEmotePickerOpen, setIsEmotePickerOpen] = useState(false);

  const [isChatLoading, setIsChatLoading] = useState(true);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Interactive Message States: Reply, Edit, Select Mode & Menus
  const initialLoadedRoomsRef = useRef<Set<string>>(new Set());
  const prevMessagesCountRef = useRef(0);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [messageExpansionSteps, setMessageExpansionSteps] = useState<Record<string, number>>({});
  const [expandedReactionMessageIds, setExpandedReactionMessageIds] = useState<Set<string>>(new Set());

  // Copy, Reaction & Hover Expansion States
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [isHoveringClearAll, setIsHoveringClearAll] = useState(false);
  const [isHoveringSelectAll, setIsHoveringSelectAll] = useState(false);
  const [isHoveringDeleteSelected, setIsHoveringDeleteSelected] = useState(false);

  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(msgId);
      setTimeout(() => {
        setCopiedMessageId((curr) => (curr === msgId ? null : curr));
      }, 1500);
    } catch (err) {
      console.error("Gagal menyalin pesan:", err);
    }
  };

  const handleReactToMessage = async (msgId: string, emoji: string) => {
    if (!roomId || !user) return;
    await toggleMessageReaction(roomId, msgId, emoji, user.uid);
  };

  const toggleExpandReaction = (msgId: string) => {
    setExpandedReactionMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  // Heartbeat untuk sinkronisasi waktu riil (batas waktu edit 90s & hapus semua orang 5 menit)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Jika sedang mengedit dan batas waktu 90s terlewati, otomatis batalkan mode edit
  useEffect(() => {
    if (!editingMessage) return;
    const elapsed = now - (editingMessage.timestamp || 0);
    if (elapsed > 90 * 1000) {
      setEditingMessage(null);
      setInputText("");
    }
  }, [now, editingMessage]);

  const handleExpandMessageStep = (msgId: string) => {
    setMessageExpansionSteps((prev) => ({
      ...prev,
      [msgId]: (prev[msgId] || 0) + 1,
    }));
  };

  const handleCollapseMessageAll = (msgId: string) => {
    setMessageExpansionSteps((prev) => {
      const next = { ...prev };
      delete next[msgId];
      return next;
    });
  };

  // Close 3-dots expanded options pill & reaction bar when clicking anywhere outside
  useEffect(() => {
    if (!activeMenuMessageId && !activeReactionMessageId) return;
    const handleClickOutside = () => {
      setActiveMenuMessageId(null);
      setActiveReactionMessageId(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [activeMenuMessageId, activeReactionMessageId]);

  // Confirmation Modals
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [singleDeleteMessageId, setSingleDeleteMessageId] = useState<string | null>(null);

  // Auto-hide scrollbar state for messages area
  const chatContainerRef = useRef<HTMLElement>(null);
  const [canChatScroll, setCanChatScroll] = useState(false);
  const [isChatScrolling, setIsChatScrolling] = useState(false);
  const chatScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if messages list actually overflows
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const checkOverflow = () => {
      const hasOverflow = el.scrollHeight > el.clientHeight + 4;
      setCanChatScroll(hasOverflow);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [messages, otherTyping, targetProfile]);

  const handleChatScroll = () => {
    if (!isChatScrolling) {
      setIsChatScrolling(true);
    }
    if (chatScrollTimeoutRef.current) {
      clearTimeout(chatScrollTimeoutRef.current);
    }
    chatScrollTimeoutRef.current = setTimeout(() => {
      setIsChatScrolling(false);
    }, 1200);
  };

  // Load current user's friends and sent requests for modal sync
  useEffect(() => {
    if (!user) return;
    getUserFriends(user.uid, currentUserProfile?.accountId).then((list) => {
      setViewerFriends(list);
    });
    getSentFriendRequests(user.uid, currentUserProfile?.accountId).then((list) => {
      setSentRequests(list);
    });
  }, [user, currentUserProfile?.accountId]);

  // 1. Real-time target profile and presence listener
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let isCancelled = false;

    async function loadAndSubscribe() {
      const { searchUserByAccountId, getUserProfile, subscribeToUserProfile } =
        await import("@/lib/firestore-service");

      let found = await searchUserByAccountId(accountId);
      if (!found) {
        found = await getUserProfile(accountId);
      }
      if (isCancelled) return;
      if (found) {
        setTargetProfile(found);
        const unsub = subscribeToUserProfile(found.uid, (liveProfile) => {
          if (liveProfile) {
            setTargetProfile(liveProfile);
          }
        });
        if (unsub) unsubscribeProfile = unsub;
      }
    }

    loadAndSubscribe();

    return () => {
      isCancelled = true;
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [accountId]);

  // 2. Live timer tick every 10s to keep "Aktif X menit lalu" updated in real-time
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 3. Initialize Chat Room & Real-time Messages / Typing Status
  const isChatActiveAndVisible = () => {
    if (typeof document === "undefined") return false;
    if (document.visibilityState !== "visible") return false;
    if (typeof document.hasFocus === "function" && !document.hasFocus()) return false;
    return true;
  };

  useEffect(() => {
    if (!user || !targetProfile) return;

    let unsubscribeMessages: (() => void) | undefined;
    let unsubscribeTyping: (() => void) | undefined;

    async function initChat() {
      try {
        const rId = await getOrCreateChatRoom(user!.uid, targetProfile!.uid);
        setRoomId(rId);
        roomIdRef.current = rId;

        // Always reset self typing status when entering room
        await setTypingStatus(rId, user!.uid, false);

        unsubscribeMessages =
          subscribeToMessages(rId, user!.uid, (msgs) => {
            setIsChatLoading(false);
            const prevCount = prevMessagesCountRef.current;
            prevMessagesCountRef.current = msgs.length;
            setMessages(msgs);

            if (user?.uid) {
              // Selalu konfirmasi pesan telah sampai di device / browser penerima (Centang 2 abu-abu)
              markMessagesAsDelivered(rId, user.uid);

              // HANYA tandai sebagai dibaca (Centang 2 biru) jika tab sedang aktif dan dilihat pengguna
              if (isChatActiveAndVisible()) {
                markMessagesAsRead(rId, user.uid);
              }
            }

            // HANYA scroll ke bawah saat:
            // 1. Initial load pertama kali untuk room ini
            // 2. Ada pesan baru yang benar-benar ditambahkan (msgs.length > prevCount)
            // TIDAK AKAN PERNAH scroll ke bawah saat reaksi emoji ditambah/dihapus atau pesan diedit!
            const isFirstLoadForRoom = !initialLoadedRoomsRef.current.has(rId);
            if (isFirstLoadForRoom) {
              if (msgs.length > 0) {
                initialLoadedRoomsRef.current.add(rId);
                setTimeout(() => {
                  if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                  }
                }, 40);
              }
            } else if (msgs.length > prevCount) {
              const lastMsg = msgs[msgs.length - 1];
              const isMyNewMsg = lastMsg && lastMsg.senderId === user?.uid;
              const container = chatContainerRef.current;
              const isNearBottom = container
                ? container.scrollHeight - container.scrollTop - container.clientHeight < 250
                : true;

              if (isMyNewMsg || isNearBottom) {
                setTimeout(() => {
                  if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTo({
                      top: chatContainerRef.current.scrollHeight,
                      behavior: "smooth",
                    });
                  }
                }, 60);
              }
            }
          }) || undefined;

        unsubscribeTyping =
          subscribeToTypingStatus(rId, (typingStatus) => {
            setOtherTyping(Boolean(typingStatus[targetProfile!.uid]));
          }) || undefined;
      } catch (err) {
        console.error("Error initializing chat:", err);
        setIsChatLoading(false);
      }
    }

    initChat();

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeTyping) unsubscribeTyping();
      // Ensure typing status is cleanly reset when unmounting or leaving page
      if (roomIdRef.current && userRef.current) {
        setTypingStatus(roomIdRef.current, userRef.current.uid, false);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (chatScrollTimeoutRef.current) clearTimeout(chatScrollTimeoutRef.current);
    };
  }, [user, targetProfile?.uid]);

  // Menandai pesan sebagai dibaca saat pengguna benar-benar beralih atau memfokuskan tab chat ini
  useEffect(() => {
    if (!roomId || !user) return;

    const handleFocusOrVisible = () => {
      if (isChatActiveAndVisible() && roomIdRef.current && userRef.current) {
        markMessagesAsRead(roomIdRef.current, userRef.current.uid);
      }
    };

    // Tandai jika saat dimuat tab memang sedang aktif & fokus
    handleFocusOrVisible();

    window.addEventListener("focus", handleFocusOrVisible);
    window.addEventListener("click", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      window.removeEventListener("focus", handleFocusOrVisible);
      window.removeEventListener("click", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, [roomId, user?.uid]);

  const handleSend = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !roomId || !user) return;

    // Jika sedang dalam mode Edit Pesan
    if (editingMessage) {
      const elapsed = Date.now() - (editingMessage.timestamp || 0);
      if (elapsed > 90 * 1000) {
        alert("Batas waktu edit (90 detik) telah terlewat.");
        setEditingMessage(null);
        setInputText("");
        return;
      }

      const res = await editMessage(roomId, editingMessage.id, inputText, user.uid);
      if (!res.success) {
        alert(res.error || "Gagal mengedit pesan.");
      }

      setEditingMessage(null);
      setInputText("");

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        setIsTextareaOverflowing(false);
      }
      return;
    }

    const textToSend = inputText;
    const currentReplyTo = replyingTo
      ? {
          id: replyingTo.id,
          text: replyingTo.text,
          senderId: replyingTo.senderId,
          senderName:
            replyingTo.senderId === user.uid
              ? currentUserProfile?.username || "Anda"
              : targetProfile?.username || "Pengguna",
        }
      : null;

    setInputText("");
    setReplyingTo(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      setIsTextareaOverflowing(false);
    }

    // Reset typing status immediately
    setIsTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    await setTypingStatus(roomId, user.uid, false);

    await sendMessage(roomId, user.uid, textToSend, currentReplyTo, isTargetOnline);
  };

  const handleStartEdit = (msg: ChatMessage) => {
    if (!user || msg.senderId !== user.uid) return;
    const elapsed = Date.now() - (msg.timestamp || 0);
    if (elapsed > 90 * 1000) return;

    setReplyingTo(null);
    setEditingMessage(msg);
    setInputText(msg.text);
    setActiveMenuMessageId(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = "auto";
        const scrollH = textareaRef.current.scrollHeight;
        const maxHeight = 100;
        textareaRef.current.style.height = `${Math.min(scrollH, maxHeight)}px`;
        setIsTextareaOverflowing(scrollH > maxHeight);
      }
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      setIsTextareaOverflowing(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollH = textareaRef.current.scrollHeight;
      const maxHeight = 100;
      textareaRef.current.style.height = `${Math.min(scrollH, maxHeight)}px`;
      setIsTextareaOverflowing(scrollH > maxHeight);
    }

    if (!roomId || !user) return;

    if (val.trim().length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        setTypingStatus(roomId, user.uid, true);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setIsTyping(false);
        if (roomId && user) {
          setTypingStatus(roomId, user.uid, false);
        }
      }, 3000);
    } else {
      if (isTyping) {
        setIsTyping(false);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        setTypingStatus(roomId, user.uid, false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleSelectEmote = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setInputText((prev) => prev + emoji);
      return;
    }

    const start = textarea.selectionStart ?? inputText.length;
    const end = textarea.selectionEnd ?? inputText.length;
    const newText = inputText.slice(0, start) + emoji + inputText.slice(end);
    setInputText(newText);

    if (newText.trim().length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        if (roomId && user) setTypingStatus(roomId, user.uid, true);
      }
    }

    setTimeout(() => {
      textarea.focus();
      const nextPos = start + emoji.length;
      textarea.setSelectionRange(nextPos, nextPos);
      
      const scrollH = textarea.scrollHeight;
      const maxHeight = 100;
      textarea.style.height = `${Math.min(scrollH, maxHeight)}px`;
      setIsTextareaOverflowing(scrollH > maxHeight);

      // Pastikan posisi scroll tidak melompat ke atas
      textarea.scrollTop = textarea.scrollHeight;
    }, 0);
  };

  const handleBack = () => {
    if (roomId && user) {
      setTypingStatus(roomId, user.uid, false);
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/" });
    }
  };

  // Close active 3-dots menu on outside click
  useEffect(() => {
    if (!activeMenuMessageId) return;
    const handleClick = () => setActiveMenuMessageId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [activeMenuMessageId]);

  // Action handlers
  const handleClearAllHistory = async () => {
    if (!roomId || !user) return;
    try {
      setIsActionProcessing(true);
      await clearAllChatHistory(roomId, user.uid);
      setShowClearAllModal(false);
      setSelectedMessageIds([]);
      setIsSelectMode(false);
      setReplyingTo(null);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleDeleteSingle = async (forEveryone: boolean = false) => {
    if (!roomId || !singleDeleteMessageId || !user) return;
    try {
      setIsActionProcessing(true);
      const res = await deleteSingleMessage(roomId, singleDeleteMessageId, user.uid, forEveryone);
      if (!res.success && res.error) {
        alert(res.error);
      }
      if (replyingTo?.id === singleDeleteMessageId) {
        setReplyingTo(null);
      }
      if (editingMessage?.id === singleDeleteMessageId) {
        handleCancelEdit();
      }
      setSingleDeleteMessageId(null);
      setActiveMenuMessageId(null);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!roomId || !user || selectedMessageIds.length === 0) return;
    try {
      setIsActionProcessing(true);
      await deleteMultipleMessages(roomId, selectedMessageIds, user.uid);
      if (replyingTo && selectedMessageIds.includes(replyingTo.id)) {
        setReplyingTo(null);
      }
      if (editingMessage && selectedMessageIds.includes(editingMessage.id)) {
        handleCancelEdit();
      }
      setSelectedMessageIds([]);
      setIsSelectMode(false);
      setShowDeleteSelectedModal(false);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessageIds.length === messages.length) {
      setSelectedMessageIds([]);
    } else {
      setSelectedMessageIds(messages.map((m) => m.id));
    }
  };

  const handleStartReply = (msg: ChatMessage) => {
    if (editingMessage) {
      handleCancelEdit();
    }
    setReplyingTo(msg);
    setActiveMenuMessageId(null);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleAddFriend = async (person?: Person) => {
    if (!user || !currentUserProfile || !targetProfile) return;
    const p = person || {
      uid: targetProfile.uid,
      accountId: targetProfile.accountId,
      name: targetProfile.username,
      initials: targetProfile.initials || targetProfile.username.slice(0, 2).toUpperCase(),
      hue: targetProfile.hue,
      avatarUrl: targetProfile.avatarUrl,
    };
    await sendFriendRequest(
      {
        uid: user.uid,
        accountId: currentUserProfile.accountId,
        name: currentUserProfile.username,
        initials:
          currentUserProfile.initials || currentUserProfile.username.slice(0, 2).toUpperCase(),
        hue: currentUserProfile.hue,
        avatarUrl: currentUserProfile.avatarUrl,
      },
      p
    );
    const updated = await getSentFriendRequests(user.uid, currentUserProfile.accountId);
    setSentRequests(updated);
  };

  const isTargetOnline = targetProfile ? isUserOnline(targetProfile) : false;

  const isRequestSent = sentRequests.some(
    (s) =>
      s.status === "pending" &&
      (s.to.accountId === targetProfile?.accountId || s.to.uid === targetProfile?.uid)
  );

  const getStatusText = () => {
    if (!targetProfile) return "Memuat...";
    if (otherTyping) return "Sedang mengetik...";
    if (isTargetOnline) return "Online";
    const lastActive = targetProfile.lastOnline || targetProfile.lastSeen;
    if (lastActive) {
      return `Aktif ${formatDistanceToNow(lastActive, { addSuffix: true, locale: id })}`;
    }
    return "Offline";
  };

  if (!user || !currentUserProfile) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-float">
          <p className="text-sm font-semibold text-muted-foreground">
            Harap login untuk menggunakan fitur chat.
          </p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            Menuju Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-transparent text-foreground">
      {/* ── HEADER CHAT ── */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/80 bg-card/95 px-3 sm:px-4 backdrop-blur-md shadow-xs">
        {isSelectMode ? (
          /* Selection Action Bar */
          <div className="flex w-full items-center justify-between animate-pop-in">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedMessageIds([]);
                }}
                className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-secondary dark:bg-zinc-800 text-foreground transition-all hover:bg-secondary/80 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer shadow-xs"
                title="Keluar mode pilih"
              >
                <X className="size-5" />
              </button>
              <span className="text-sm font-bold text-foreground">
                {selectedMessageIds.length} Dipilih
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Tombol Pilih Semua (Icon Kotak Centang -> Melebar saat hover) */}
              <button
                type="button"
                onMouseEnter={() => setIsHoveringSelectAll(true)}
                onMouseLeave={() => setIsHoveringSelectAll(false)}
                onClick={handleSelectAll}
                className="flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-full border border-border/80 bg-secondary/80 dark:bg-zinc-800 text-foreground transition-all duration-200 hover:bg-secondary dark:hover:bg-zinc-700 active:scale-95 cursor-pointer overflow-hidden shadow-xs"
                title={selectedMessageIds.length === messages.length ? "Batal" : "Pilih Semua"}
              >
                <CheckSquare className="size-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {isHoveringSelectAll && (
                    <motion.span
                      key="text-select-all"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden whitespace-nowrap text-xs font-semibold pl-0.5 inline-block"
                    >
                      {selectedMessageIds.length === messages.length ? "Batal" : "Pilih Semua"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Tombol Hapus Terpilih (Icon Trash -> Melebar saat hover) */}
              <button
                type="button"
                onMouseEnter={() => setIsHoveringDeleteSelected(true)}
                onMouseLeave={() => setIsHoveringDeleteSelected(false)}
                onClick={() => setShowDeleteSelectedModal(true)}
                disabled={selectedMessageIds.length === 0}
                className="flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-full bg-destructive text-destructive-foreground transition-all duration-200 hover:bg-destructive/90 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95 shadow-xs mr-1 sm:mr-2 overflow-hidden"
                title="Hapus pesan yang dipilih"
              >
                <Trash2 className="size-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {isHoveringDeleteSelected && (
                    <motion.span
                      key="text-delete-selected"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden whitespace-nowrap text-xs font-bold pl-0.5 inline-block"
                    >
                      Hapus
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Header */
          <>
            <div className="flex flex-1 min-w-0 items-center gap-2.5 sm:gap-3 p-1 -m-1">
              {/* Tombol Back di sebelah kiri Avatar */}
              <button
                type="button"
                onClick={handleBack}
                className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-secondary dark:bg-zinc-800 text-black dark:text-white transition-all duration-300 hover:bg-secondary/70 dark:hover:bg-zinc-700 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                title="Kembali"
                aria-label="Kembali"
              >
                <ArrowLeft className="size-5" />
              </button>

              {targetProfile ? (
                <div
                  className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3 cursor-pointer select-none rounded-xl p-1 transition-opacity hover:opacity-85"
                  onClick={() => setActiveProfileAccountId(targetProfile.accountId)}
                  title="Klik untuk melihat profil akun"
                >
                  {/* Avatar Akun */}
                  <div className="relative shrink-0">
                    {targetProfile.avatarUrl ? (
                      <img
                        src={targetProfile.avatarUrl}
                        alt={targetProfile.username}
                        className="size-10 sm:size-11 rounded-full object-cover shadow-xs"
                      />
                    ) : (
                      <span
                        className="flex size-10 sm:size-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-xs border border-black dark:border-white"
                        style={{
                          backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${targetProfile.hue}), oklch(0.66 0.13 ${targetProfile.hue + 25}))`,
                        }}
                      >
                        {targetProfile.initials}
                      </span>
                    )}
                    {/* Badge Status Bulat */}
                    {isTargetOnline && (
                      <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-emerald-500 shadow-xs" />
                    )}
                  </div>

                  {/* Username & Status Aktif / Mengetik */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm sm:text-base font-bold text-foreground">
                      {targetProfile.username}
                    </span>
                    <span
                      className={`truncate text-xs font-medium ${
                        otherTyping || isTargetOnline
                          ? "text-primary font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {getStatusText()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="size-8 rounded-full bg-secondary animate-pulse" />
                  <span>Memuat lawan bicara...</span>
                </div>
              )}
            </div>

            {/* Tombol Hapus Semua Riwayat Chat (Pojok Kanan Atas: Icon Trash melebar ke kiri saat hover) */}
            <div className="shrink-0 flex items-center justify-end pr-1 sm:pr-2">
              <button
                type="button"
                onMouseEnter={() => setIsHoveringClearAll(true)}
                onMouseLeave={() => setIsHoveringClearAll(false)}
                onClick={() => setShowClearAllModal(true)}
                disabled={messages.length === 0}
                className="group flex items-center justify-center gap-1.5 h-9 sm:h-10 px-2.5 rounded-full border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white dark:border-destructive/40 dark:bg-destructive/15 dark:hover:bg-destructive dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-xs active:scale-95 overflow-hidden transition-all duration-200"
                title="Hapus semua riwayat chat"
              >
                <Trash2 className="size-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {isHoveringClearAll && (
                    <motion.span
                      key="text-clear-all"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden whitespace-nowrap text-xs font-bold pl-0.5 inline-block"
                    >
                      Hapus Riwayat
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </>
        )}
      </header>

      {/* ── MESSAGES LIST ── */}
      <main 
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className={`flex-1 px-3 py-4 sm:px-6 space-y-3 overflow-y-auto overflow-x-hidden chat-scroll-area ${
          isChatScrolling ? "is-scrolling" : ""
        }`}
      >
        {(isChatLoading || !targetProfile || !roomId) ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-muted-foreground py-16 gap-3">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">Menghubungkan...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground py-12">
            <p className="text-sm font-semibold text-foreground">Belum ada percakapan.</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Mulai kirimkan pesan kepada {targetProfile.username} sekarang?
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
          const isMine = msg.senderId === user.uid;
          
          // Date separator logic
          const currentMsgDate = new Date(msg.timestamp || Date.now());
          const previousMsg = index > 0 ? messages[index - 1] : null;
          const previousMsgDate = previousMsg ? new Date(previousMsg.timestamp || Date.now()) : null;
          
          const isDifferentDay = !previousMsgDate || 
            currentMsgDate.getDate() !== previousMsgDate.getDate() ||
            currentMsgDate.getMonth() !== previousMsgDate.getMonth() ||
            currentMsgDate.getFullYear() !== previousMsgDate.getFullYear();

          let dateDividerLabel = "";
          if (isDifferentDay) {
            if (isToday(currentMsgDate)) {
              dateDividerLabel = "Hari ini";
            } else if (isYesterday(currentMsgDate)) {
              dateDividerLabel = "Kemarin";
            } else {
              dateDividerLabel = format(currentMsgDate, "d MMM yyyy", { locale: id });
            }
          }

          const profileToUse = isMine ? currentUserProfile : targetProfile;
          const initials = profileToUse?.initials || profileToUse?.username?.slice(0, 2).toUpperCase() || "UU";
          const hue = profileToUse?.hue || 0;
          const avatarUrl = profileToUse?.avatarUrl;

          const isSelected = selectedMessageIds.includes(msg.id);

          return (
            <div key={msg.id} className="flex flex-col w-full">
              {/* Date Divider */}
              {isDifferentDay && (
                <div className="flex w-full items-center justify-center my-4">
                  <span className="text-xs font-bold text-muted-foreground">
                    {dateDividerLabel}
                  </span>
                </div>
              )}

              {/* Message Row */}
              <div
                onClick={() => {
                  if (isSelectMode) toggleSelectMessage(msg.id);
                }}
                className={`group/row relative flex w-full mt-2 ${
                  isMine ? "justify-end" : "justify-start"
                } items-start gap-2 ${
                  isSelectMode ? "cursor-pointer rounded-2xl p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5" : ""
                } ${isSelected ? "bg-primary/10 dark:bg-primary/15 rounded-2xl" : ""}`}
              >
                {/* Checkbox Indikator saat Mode Select */}
                {isSelectMode && (
                  <div className="flex items-center self-center shrink-0 mr-1">
                    <div
                      className={`flex size-5 items-center justify-center rounded-full border transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/50 bg-card"
                      }`}
                    >
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                    </div>
                  </div>
                )}

                {/* Other User Avatar */}
                {!isMine && (
                  <div 
                    className={`shrink-0 mt-0.5 transition-opacity ${
                      isSelectMode ? "cursor-default opacity-80" : "cursor-pointer hover:opacity-80"
                    }`}
                    onClick={() => {
                      if (!isSelectMode) setActiveProfileAccountId(targetProfile!.accountId);
                    }}
                    title={isSelectMode ? undefined : "Lihat profil"}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={profileToUse?.username}
                        className="size-9 sm:size-10 rounded-full object-cover shadow-xs"
                      />
                    ) : (
                      <span
                        className="flex size-9 sm:size-10 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs"
                        style={{
                          backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${hue}), oklch(0.66 0.13 ${hue + 25}))`,
                        }}
                      >
                        {initials}
                      </span>
                    )}
                  </div>
                )}

                {/* Tombol Aksi Hover untuk Pesan Saya: [Emote] -> [Titik 3] -> [Copy] -> [Reply] -> [Edit] */}
                {!isSelectMode && isMine && !msg.deletedForEveryone && (
                  <motion.div
                    layout
                    transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                    className={`transition-opacity duration-150 flex items-center gap-1.5 self-center shrink-0 ${
                      activeMenuMessageId === msg.id || activeReactionMessageId === msg.id
                        ? "opacity-100"
                        : "opacity-0 group-hover/row:opacity-100"
                    }`}
                  >
                    {/* 1. Tombol Emote (Di Sebelah Kiri Titik 3) */}
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                      className="flex items-center rounded-full border border-border/80 bg-card/95 dark:bg-zinc-800/95 shadow-xs overflow-hidden p-0.5"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id);
                          setActiveMenuMessageId(null);
                        }}
                        className={`flex size-6 sm:size-7 items-center justify-center rounded-full transition-colors cursor-pointer ${
                          activeReactionMessageId === msg.id
                            ? "bg-secondary dark:bg-zinc-700 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-700"
                        }`}
                        title="Beri reaksi emote"
                      >
                        <SmileIcon className="size-3.5" />
                      </button>

                      <AnimatePresence initial={false}>
                        {activeReactionMessageId === msg.id && (
                          <motion.div
                            key="mine-quick-reactions"
                            initial={{ width: 0, opacity: 0, scale: 0.85 }}
                            animate={{ width: "auto", opacity: 1, scale: 1 }}
                            exit={{ width: 0, opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="flex items-center gap-1 overflow-hidden px-1"
                          >
                            {["❤️", "👍", "😂", "😮", "😢", "🙏"].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleReactToMessage(msg.id, emoji);
                                  setActiveReactionMessageId(null);
                                }}
                                className="flex size-6 sm:size-7 items-center justify-center rounded-full text-sm transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                              >
                                <span className="select-none leading-none">{emoji}</span>
                              </button>
                            ))}
                            {/* Tombol + untuk membuka pop up emote picker */}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id);
                                setActiveReactionMessageId(null);
                              }}
                              className="flex size-6 sm:size-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                              title="Pilih emote lainnya"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* 2. Tombol Titik 3 */}
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                      className="flex items-center rounded-full border border-border/80 bg-card/95 dark:bg-zinc-800/95 shadow-xs overflow-hidden p-0.5"
                    >
                      <AnimatePresence initial={false}>
                        {activeMenuMessageId === msg.id && (
                          <motion.div
                            key="mine-expanded-actions"
                            initial={{ width: 0, opacity: 0, scale: 0.85 }}
                            animate={{ width: "auto", opacity: 1, scale: 1 }}
                            exit={{ width: 0, opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="flex items-center gap-0.5 overflow-hidden pr-0.5"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSingleDeleteMessageId(msg.id);
                                setActiveMenuMessageId(null);
                              }}
                              className="flex size-6 sm:size-7 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Hapus pesan"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsSelectMode(true);
                                setSelectedMessageIds([msg.id]);
                                setActiveMenuMessageId(null);
                              }}
                              className="flex size-6 sm:size-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="Pilih pesan"
                            >
                              <CheckSquare className="size-3.5" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuMessageId(activeMenuMessageId === msg.id ? null : msg.id);
                          setActiveReactionMessageId(null);
                        }}
                        className={`flex size-6 sm:size-7 items-center justify-center rounded-full transition-colors cursor-pointer ${
                          activeMenuMessageId === msg.id
                            ? "bg-secondary dark:bg-zinc-700 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-700"
                        }`}
                        title="Opsi pesan"
                      >
                        <MoreHorizontal className="size-3.5" />
                      </button>
                    </motion.div>

                    {/* 3. Tombol Copy (Di Samping Kiri Tombol Reply) */}
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                      className="flex items-center rounded-full border border-border/80 bg-card/95 dark:bg-zinc-800/95 shadow-xs overflow-hidden p-0.5"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyMessage(msg.id, msg.text);
                        }}
                        className="flex size-6 sm:size-7 items-center justify-center rounded-full transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-700"
                        title="Salin pesan"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="size-3.5 text-emerald-500 stroke-[3]" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </motion.div>

                    {/* 4. Tombol Reply */}
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                      className="flex items-center rounded-full border border-border/80 bg-card/95 dark:bg-zinc-800/95 shadow-xs overflow-hidden p-0.5"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartReply(msg);
                        }}
                        className="flex size-6 sm:size-7 items-center justify-center rounded-full transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-700"
                        title="Balas pesan"
                      >
                        <Reply className="size-3.5" />
                      </button>
                    </motion.div>

                    {/* 5. Tombol Edit (Di sebelah kanan tombol Reply, dengan animasi pergeseran halus saat hilang) */}
                    <AnimatePresence initial={false}>
                      {msg.timestamp && now - msg.timestamp <= 90 * 1000 && (
                        <motion.div
                          layout
                          key={`edit-wrapper-${msg.id}`}
                          initial={{ opacity: 0, width: 0, scale: 0.8 }}
                          animate={{ opacity: 1, width: "auto", scale: 1 }}
                          exit={{ opacity: 0, width: 0, scale: 0.8 }}
                          transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }, duration: 0.22 }}
                          className="overflow-hidden flex items-center shrink-0"
                        >
                          <div className="flex items-center rounded-full border border-border/80 bg-card/95 dark:bg-zinc-800/95 shadow-xs overflow-hidden p-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(msg);
                              }}
                              className="flex size-6 sm:size-7 items-center justify-center rounded-full transition-colors cursor-pointer text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="Edit pesan"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Message Content Bubble */}
                <div
                  className={`relative flex flex-col min-w-0 max-w-[75%] sm:max-w-[70%] ${isMine ? "items-end" : "items-start"}`}
                >
                  {/* Pop up Picker Emote Tambahan saat tombol + diklik */}
                  {reactionPickerMessageId === msg.id && (
                    <TikTokEmotePicker
                      isOpen={true}
                      onClose={() => setReactionPickerMessageId(null)}
                      onSelectEmote={(chosenEmote) => {
                        handleReactToMessage(msg.id, chosenEmote);
                        setReactionPickerMessageId(null);
                      }}
                      placement={index < 3 ? "bottom" : "top"}
                      align={isMine ? "right" : "left"}
                    />
                  )}

                  <div
                    className={`group relative min-w-0 max-w-full rounded-[10px] overflow-hidden shadow-sm font-medium border-0 ${
                      isMine ? "chat-bubble-mine" : "chat-bubble-theirs"
                    }`}
                  >
                    {/* Pesan ini telah dihapus (Hapus untuk Semua Orang) */}
                    {msg.deletedForEveryone ? (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs italic text-muted-foreground dark:text-emerald-100/70 select-none">
                        <Ban className="size-3.5 text-destructive/80 dark:text-emerald-300/80 shrink-0" />
                        <span>Pesan ini telah dihapus</span>
                      </div>
                    ) : (
                      <>
                        {/* Kutipan Balasan Pesan (Jika ada) */}
                        {msg.replyTo && (
                          <div className="px-3 py-1.5 text-xs border-b bg-black/[0.15] dark:bg-black/30 border-black/[0.08] dark:border-white/10">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <div className="w-1 h-3 rounded-full bg-emerald-600 dark:bg-emerald-300/80" />
                              <span className="font-bold truncate text-[11px] text-emerald-800 dark:text-emerald-300">
                                {msg.replyTo.senderName ||
                                  (msg.replyTo.senderId === user.uid
                                    ? "Anda"
                                    : targetProfile?.username || "Pengguna")}
                              </span>
                            </div>
                            <span className="line-clamp-1 truncate block text-[11px] font-medium text-zinc-700 dark:text-emerald-100/90">
                              {renderMessageWithEmotes(msg.replyTo.text)}
                            </span>
                          </div>
                        )}

                        {/* Teks Pesan dengan Fitur Baca Selengkapnya Bertahap */}
                        {(() => {
                          if (isMessageOnlyEmojis(msg.text)) {
                            return (
                              <div className="min-w-0 [word-break:break-word] [overflow-wrap:break-word] px-3 py-1 text-2xl sm:text-3xl leading-tight">
                                {renderMessageWithEmotes(msg.text)}
                              </div>
                            );
                          }

                          const lines = msg.text.split("\n");
                          const isLongInitially = msg.text.length > 550 || lines.length > 10;
                          const step = messageExpansionSteps[msg.id] || 0;

                          let textToShow = msg.text;
                          let hasMoreToExpand = false;

                          if (isLongInitially) {
                            const allowedChars = 1000 + step * 1000;
                            const allowedLines = 10 + step * 10;

                            let truncated = false;
                            if (lines.length > allowedLines) {
                              textToShow = lines.slice(0, allowedLines).join("\n");
                              if (textToShow.length > allowedChars) {
                                textToShow = textToShow.slice(0, allowedChars);
                              }
                              truncated = true;
                            } else if (msg.text.length > allowedChars) {
                              textToShow = msg.text.slice(0, allowedChars);
                              truncated = true;
                            }

                            if (truncated) {
                              textToShow = textToShow + "...";
                              hasMoreToExpand = true;
                            } else {
                              hasMoreToExpand = false;
                            }
                          }

                          return (
                            <div className="min-w-0 [word-break:break-word] [overflow-wrap:break-word] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed">
                              {renderMessageWithEmotes(textToShow)}
                              {isLongInitially && (
                                <div className="mt-1.5 flex items-center gap-3 select-none">
                                  {hasMoreToExpand && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleExpandMessageStep(msg.id);
                                      }}
                                      className="inline-block text-xs font-bold transition-opacity cursor-pointer hover:underline text-emerald-600 dark:text-emerald-300 hover:text-emerald-700 dark:hover:text-white"
                                    >
                                      Baca Selengkapnya
                                    </button>
                                  )}
                                  {step > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCollapseMessageAll(msg.id);
                                      }}
                                      className="inline-block text-xs font-bold transition-opacity cursor-pointer hover:underline text-emerald-600/90 dark:text-emerald-300/90 hover:text-emerald-700 dark:hover:text-white"
                                    >
                                      Lebih Sedikit
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  {/* Reaction Emojis di Bawah Balok Pesan */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.deletedForEveryone && (() => {
                    const activeEntries = Object.entries(msg.reactions).filter(
                      ([_, userIds]) => Array.isArray(userIds) && userIds.length > 0
                    );
                    if (activeEntries.length === 0) return null;

                    // Urutkan activeEntries berdasarkan reactionTimestamps agar konsisten di semua platform/client
                    activeEntries.sort((a, b) => {
                      const timeA = msg.reactionTimestamps?.[a[0]] || 0;
                      const timeB = msg.reactionTimestamps?.[b[0]] || 0;
                      return timeA - timeB;
                    });

                    // Jika lastReactionEmoji tercatat, pastikan posisinya di urutan paling akhir
                    if (msg.lastReactionEmoji) {
                      const idx = activeEntries.findIndex(([em]) => em === msg.lastReactionEmoji);
                      if (idx !== -1 && idx !== activeEntries.length - 1) {
                        const [target] = activeEntries.splice(idx, 1);
                        if (target) activeEntries.push(target);
                      }
                    }

                    // Untuk sudut pandang pengirim (isMine): emoji terbaru di samping kanan ([lama, ..., terbaru])
                    // Untuk sudut pandang penerima (!isMine): emoji terbaru di samping kiri ([terbaru, ..., lama])
                    const orderedEntries = isMine ? activeEntries : [...activeEntries].reverse();

                    const isReactionExpanded = expandedReactionMessageIds.has(msg.id);
                    // Pesan pendek (<= 14 karakter) dengan > 1 reaksi memicu sistem 'Selengkapnya' (< / >)
                    const isShortMessage = (msg.text || "").trim().length <= 14;
                    const shouldCollapse = isShortMessage && activeEntries.length > 1;

                    const lastEntry = activeEntries[activeEntries.length - 1];
                    if (!lastEntry) return null;

                    // Jika collapse dan belum diexpand: sembunyikan reaksi awal, tampilkan hanya reaksi terakhir
                    const entriesToDisplay = shouldCollapse && !isReactionExpanded
                      ? [lastEntry]
                      : orderedEntries;

                    return (
                      <div className={`flex items-center gap-1 mt-1.5 px-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        {/* Icon '<' (ChevronLeft) untuk sudut pandang pengirim pesan di samping kiri emoji */}
                        {shouldCollapse && isMine && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleExpandReaction(msg.id);
                            }}
                            className="inline-flex items-center justify-center p-0.5 text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                            title={isReactionExpanded ? "Tampilkan lebih sedikit" : "Selengkapnya"}
                          >
                            <ChevronLeft className="size-3.5 stroke-[2.5]" />
                          </button>
                        )}

                        {entriesToDisplay.map(([emoji, userIds]) => (
                          <button
                            key={emoji}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleReactToMessage(msg.id, emoji);
                            }}
                            className="inline-flex items-center transition-transform cursor-pointer hover:scale-125 active:scale-95 select-none"
                            title={`${emoji} (${userIds.length})`}
                          >
                            <span className="text-sm sm:text-[15px] leading-none">{emoji}</span>
                          </button>
                        ))}

                        {/* Icon '>' (ChevronRight) untuk sudut pandang penerima pesan di samping kanan emoji */}
                        {shouldCollapse && !isMine && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleExpandReaction(msg.id);
                            }}
                            className="inline-flex items-center justify-center p-0.5 text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                            title={isReactionExpanded ? "Tampilkan lebih sedikit" : "Selengkapnya"}
                          >
                            <ChevronRight className="size-3.5 stroke-[2.5]" />
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Timestamp & Status Icon Pesan Pengirim (WhatsApp style) */}
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground dark:text-zinc-400 px-1">
                    <span>{format(currentMsgDate, "HH:mm")}</span>
                    {msg.isEdited && !msg.deletedForEveryone && (
                      <span className="text-[11px] font-semibold text-foreground">
                        (diedit)
                      </span>
                    )}

                    {/* Indikator Status Pesan Pengirim (WhatsApp style real-time) */}
                    {isMine && !msg.deletedForEveryone && (() => {
                      const isPending = msg.id.startsWith("local_") || !msg.timestamp;
                      if (isPending) {
                        return (
                          <span title="Sedang mengirim..." className="text-muted-foreground/60 animate-pulse">
                            <Clock className="size-3 stroke-[2.5]" />
                          </span>
                        );
                      }
                      if (msg.read) {
                        return (
                          <span title="Dibaca" className="text-sky-400 dark:text-sky-400 font-bold">
                            <CheckCheck className="size-3.5 stroke-[2.5]" />
                          </span>
                        );
                      }
                      if (msg.delivered) {
                        return (
                          <span title="Terkirim ke penerima" className="text-muted-foreground/80">
                            <CheckCheck className="size-3.5 stroke-[2]" />
                          </span>
                        );
                      }
                      return (
                        <span title="Terkirim ke server" className="text-muted-foreground/80">
                          <Check className="size-3 stroke-[2.5]" />
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Tombol Aksi Hover untuk Pesan Lawan Bicara: [Reply] -> [Copy] -> [Titik 3] -> [Emote] */}
                {!isSelectMode && !isMine && !msg.deletedForEveryone && (
                  <motion.div
                    layout
                    transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                    className={`transition-opacity duration-150 flex items-center gap-1.5 self-center shrink-0 ${
                      activeMenuMessageId === msg.id || activeReactionMessageId === msg.id
                        ? "opacity-100"
                        : "opacity-0 group-hover/row:opacity-100"
                    }`}
                  >
                    {/* 1. Tombol Reply */}
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                      className="flex items-center rounded-full border border-border/80 bg-card/95 dark:bg-zinc-800/95 shadow-xs overflow-hidden p-0.5"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartReply(msg);
                        }}
                        className="flex size-6 sm:size-7 items-center justify-center rounded-full transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-700"
                        title="Balas pesan"
                      >
                        <Reply className="size-3.5" />
                      </button>
                    </motion.div>

                    {/* 2. Tombol Copy (Di Sebelah Kanan Tombol Reply) */}
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                      className="flex items-center rounded-full border border-border/80 bg-card/95 dark:bg-zinc-800/95 shadow-xs overflow-hidden p-0.5"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyMessage(msg.id, msg.text);
                        }}
                        className="flex size-6 sm:size-7 items-center justify-center rounded-full transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-700"
                        title="Salin pesan"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="size-3.5 text-emerald-500 stroke-[3]" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </motion.div>

                    {/* 3. Balok Tombol Titik 3 */}
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                      className="flex items-center rounded-full border border-border/80 bg-card/95 dark:bg-zinc-800/95 shadow-xs overflow-hidden p-0.5"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuMessageId(activeMenuMessageId === msg.id ? null : msg.id);
                          setActiveReactionMessageId(null);
                        }}
                        className={`flex size-6 sm:size-7 items-center justify-center rounded-full transition-colors cursor-pointer ${
                          activeMenuMessageId === msg.id
                            ? "bg-secondary dark:bg-zinc-700 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-700"
                        }`}
                        title="Opsi pesan"
                      >
                        <MoreHorizontal className="size-3.5" />
                      </button>

                      <AnimatePresence initial={false}>
                        {activeMenuMessageId === msg.id && (
                          <motion.div
                            key="other-expanded-actions"
                            initial={{ width: 0, opacity: 0, scale: 0.85 }}
                            animate={{ width: "auto", opacity: 1, scale: 1 }}
                            exit={{ width: 0, opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="flex items-center gap-0.5 overflow-hidden pl-0.5"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsSelectMode(true);
                                setSelectedMessageIds([msg.id]);
                                setActiveMenuMessageId(null);
                              }}
                              className="flex size-6 sm:size-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="Pilih pesan"
                            >
                              <CheckSquare className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSingleDeleteMessageId(msg.id);
                                setActiveMenuMessageId(null);
                              }}
                              className="flex size-6 sm:size-7 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Hapus pesan"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* 4. Tombol Emote (Di Sebelah Kanan Tombol Titik 3) */}
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                      className="flex items-center rounded-full border border-border/80 bg-card/95 dark:bg-zinc-800/95 shadow-xs overflow-hidden p-0.5"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id);
                          setActiveMenuMessageId(null);
                        }}
                        className={`flex size-6 sm:size-7 items-center justify-center rounded-full transition-colors cursor-pointer ${
                          activeReactionMessageId === msg.id
                            ? "bg-secondary dark:bg-zinc-700 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-700"
                        }`}
                        title="Beri reaksi emote"
                      >
                        <SmileIcon className="size-3.5" />
                      </button>

                      <AnimatePresence initial={false}>
                        {activeReactionMessageId === msg.id && (
                          <motion.div
                            key="other-quick-reactions"
                            initial={{ width: 0, opacity: 0, scale: 0.85 }}
                            animate={{ width: "auto", opacity: 1, scale: 1 }}
                            exit={{ width: 0, opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="flex items-center gap-1 overflow-hidden px-1"
                          >
                            {["❤️", "👍", "😂", "😮", "😢", "🙏"].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleReactToMessage(msg.id, emoji);
                                  setActiveReactionMessageId(null);
                                }}
                                className="flex size-6 sm:size-7 items-center justify-center rounded-full text-sm transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                              >
                                <span className="select-none leading-none">{emoji}</span>
                              </button>
                            ))}
                            {/* Tombol + untuk membuka pop up emote picker */}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id);
                                setActiveReactionMessageId(null);
                              }}
                              className="flex size-6 sm:size-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                              title="Pilih emote lainnya"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )}

                {/* My Avatar */}
                {isMine && (
                  <div 
                    className={`shrink-0 mt-0.5 transition-opacity ${
                      isSelectMode ? "cursor-default opacity-80" : "cursor-pointer hover:opacity-80"
                    }`}
                    onClick={() => {
                      if (!isSelectMode) setActiveProfileAccountId(currentUserProfile.accountId);
                    }}
                    title={isSelectMode ? undefined : "Lihat profil"}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={profileToUse?.username}
                        className="size-9 sm:size-10 rounded-full object-cover shadow-xs"
                      />
                    ) : (
                      <span
                        className="flex size-9 sm:size-10 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs"
                        style={{
                          backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${hue}), oklch(0.66 0.13 ${hue + 25}))`,
                        }}
                      >
                        {initials}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }))}
        <div ref={messagesEndRef} className="h-2" />
      </main>

      {/* ── BANNER PREVIEW BALAS PESAN (DENGAN EFEK MOTION SPRING) ── */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            key="reply-preview-banner"
            initial={{ opacity: 0, height: 0, y: 14 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 14 }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 32,
              opacity: { duration: 0.2 },
            }}
            className="overflow-hidden border-t border-border/70 bg-card/95 backdrop-blur-md"
          >
            <div className="px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Reply className="size-3.5" />
                </div>
                <div className="flex flex-col min-w-0 border-l-2 border-primary pl-2.5">
                  <span className="text-xs font-bold text-primary truncate">
                    Membalas {replyingTo.senderId === user.uid ? "Anda" : targetProfile?.username || "Pengguna"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-sm sm:max-w-xl">
                    {replyingTo.text}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Batal balas"
              >
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BANNER EDIT PESAN (DENGAN EFEK MOTION SPRING) ── */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            key="edit-preview-banner"
            initial={{ opacity: 0, height: 0, y: 14 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 14 }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 32,
              opacity: { duration: 0.2 },
            }}
            className="overflow-hidden border-t border-emerald-500/30 bg-card/95 backdrop-blur-md"
          >
            <div className="px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Pencil className="size-3.5" />
                </div>
                <div className="flex flex-col min-w-0 border-l-2 border-emerald-500 pl-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Edit Pesan
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-sm sm:max-w-xl">
                    {editingMessage.text}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Batal edit"
              >
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INPUT KOLOM KETIK (FULL WIDTH & DARK MODE COMPATIBLE) ── */}
      <footer className="sticky bottom-0 z-30 w-full border-t border-border/80 bg-card/95 backdrop-blur-md px-3 py-3 sm:px-6 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        <form onSubmit={handleSend} className="relative mx-auto flex w-full items-end gap-2 sm:gap-3">
          <div className="flex-1 min-h-[44px] max-h-[120px] rounded-2xl border border-border/80 bg-secondary/80 dark:bg-card dark:border-white/20 pl-4 pr-1.5 py-2.5 shadow-inner transition-all focus-within:border-primary dark:focus-within:border-primary focus-within:bg-background dark:focus-within:bg-card/90 focus-within:ring-2 focus-within:ring-primary/20 flex items-center">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              placeholder={editingMessage ? "Edit pesan Anda..." : replyingTo ? "Tulis balasan..." : "Ketik pesan..."}
              rows={1}
              className="w-full bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 resize-none p-0 text-sm sm:text-base text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-400 chat-input-scrollbar leading-relaxed [word-break:break-word] [overflow-wrap:break-word]"
              style={{
                height: "auto",
                maxHeight: "100px",
                overflowY: isTextareaOverflowing ? "auto" : "hidden",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
              }}
            />
          </div>

          {/* Tombol Emote & Kirim */}
          <div className="relative flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Popover TikTok Emote Picker */}
            <TikTokEmotePicker
              isOpen={isEmotePickerOpen}
              onClose={() => setIsEmotePickerOpen(false)}
              onSelectEmote={handleSelectEmote}
              triggerRef={emoteButtonRef}
            />

            {/* Tombol Emote di samping kiri tombol kirim */}
            <button
              ref={emoteButtonRef}
              type="button"
              onClick={() => setIsEmotePickerOpen((prev) => !prev)}
              className={`flex size-11 items-center justify-center rounded-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs border ${
                isEmotePickerOpen
                  ? "bg-primary/20 text-primary border-primary/40 dark:border-primary/50 scale-105"
                  : "bg-secondary/80 dark:bg-card text-foreground/80 dark:text-white/80 border-border/80 dark:border-white/20 hover:bg-secondary dark:hover:bg-zinc-800"
              }`}
              title="Pilih Emote"
              aria-label="Pilih Emote"
            >
              <SmileIcon className="size-5" />
            </button>

            {/* Tombol Kirim / Simpan Edit */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`flex size-11 shrink-0 items-center justify-center rounded-2xl transition-all cursor-pointer shadow-soft disabled:opacity-40 disabled:hover:scale-100 ${
                editingMessage
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95"
              }`}
              title={editingMessage ? "Simpan perubahan pesan" : "Kirim pesan"}
              aria-label={editingMessage ? "Simpan perubahan pesan" : "Kirim pesan"}
            >
              {editingMessage ? (
                <Check className="size-5 stroke-[2.5]" />
              ) : (
                <Send className="size-5 -ml-0.5" />
              )}
            </button>
          </div>
        </form>
      </footer>

      {/* ── MODAL KONFIRMASI: HAPUS SEMUA RIWAYAT ── */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-pop-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-float flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3.5">
              <Trash2 className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">Hapus Riwayat Chat?</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Seluruh percakapan dengan <strong className="text-foreground">{targetProfile?.username}</strong> akan dihapus dari tampilan Anda.
            </p>
            <div className="mt-5 flex w-full gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 rounded-xl border border-border/80 bg-secondary/80 dark:bg-zinc-800 py-2.5 text-xs font-bold text-foreground hover:bg-secondary dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAllHistory}
                disabled={isActionProcessing}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-destructive py-2.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer shadow-soft disabled:opacity-50"
              >
                {isActionProcessing && <Loader2 className="size-3.5 animate-spin" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI: HAPUS PESAN TERPILIH (SELECT MODE) ── */}
      {showDeleteSelectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-pop-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-float flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3.5">
              <Trash2 className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Hapus {selectedMessageIds.length} Pesan?
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Pesan yang Anda pilih akan dihapus dari tampilan Anda. Lawan bicara tetap dapat melihat pesan-pesan tersebut.
            </p>
            <div className="mt-5 flex w-full gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteSelectedModal(false)}
                className="flex-1 rounded-xl border border-border/80 bg-secondary/80 dark:bg-zinc-800 py-2.5 text-xs font-bold text-foreground hover:bg-secondary dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={isActionProcessing}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-destructive py-2.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer shadow-soft disabled:opacity-50"
              >
                {isActionProcessing && <Loader2 className="size-3.5 animate-spin" />}
                <span>Hapus untuk Saya</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI: HAPUS 1 PESAN (DENGAN OPSI HAPUS UNTUK SAYA & UNTUK SEMUA ORANG) ── */}
      {singleDeleteMessageId && (() => {
        const msgToDelete = messages.find((m) => m.id === singleDeleteMessageId);
        const isEligibleForEveryone = Boolean(
          msgToDelete &&
          msgToDelete.senderId === user?.uid &&
          (now - (msgToDelete.timestamp || 0) <= 5 * 60 * 1000)
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-pop-in">
            <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-float flex flex-col items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3.5">
                <Trash2 className="size-7" />
              </div>
              <h3 className="text-base font-bold text-foreground">Hapus Pesan?</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Pilih opsi penghapusan yang ingin Anda lakukan:
              </p>

              <div className="mt-4 flex flex-col w-full gap-2">
                {/* Opsi 1: Hapus untuk Diri Sendiri */}
                <button
                  type="button"
                  onClick={() => handleDeleteSingle(false)}
                  disabled={isActionProcessing}
                  className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-secondary/50 dark:bg-zinc-800/60 p-3 text-xs font-bold text-foreground hover:border-primary/50 hover:bg-secondary dark:hover:bg-zinc-800 transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  {isActionProcessing && <Loader2 className="size-3.5 animate-spin text-primary" />}
                  <span>Hapus untuk Saya</span>
                </button>

                {/* Opsi 2: Hapus untuk Semua Orang (Hanya jika pengirim & usia <= 5 menit) */}
                {isEligibleForEveryone && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSingle(true)}
                    disabled={isActionProcessing}
                    className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-destructive/30 bg-destructive/10 dark:bg-destructive/20 p-3 text-xs font-bold text-destructive hover:bg-destructive/20 dark:hover:bg-destructive/30 transition-all cursor-pointer text-center disabled:opacity-50"
                  >
                    {isActionProcessing && <Loader2 className="size-3.5 animate-spin text-destructive" />}
                    <span>Hapus untuk Semua Orang</span>
                  </button>
                )}
              </div>

              <div className="mt-4 flex w-full">
                <button
                  type="button"
                  onClick={() => setSingleDeleteMessageId(null)}
                  className="w-full rounded-xl border border-border/80 bg-secondary/80 dark:bg-zinc-800 py-2.5 text-xs font-bold text-foreground hover:bg-secondary dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL PROFIL SINGKAT KETIKA KLIK AVATAR/USERNAME ── */}
      {activeProfileAccountId && (
        <PublicProfileModal
          accountId={activeProfileAccountId}
          viewerUid={user.uid}
          viewerFriends={viewerFriends}
          isFriend={viewerFriends.some(
            (f) => f.accountId === activeProfileAccountId
          )}
          isRequestSent={isRequestSent}
          onAddFriend={handleAddFriend}
          hideChatButton={true}
          onClose={() => setActiveProfileAccountId(null)}
        />
      )}
    </div>
  );
}
