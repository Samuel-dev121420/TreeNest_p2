import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  addDoc,
  arrayUnion,
  writeBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import type { Unsubscribe } from "firebase/firestore";
import type { UserProfile } from "./firestore-service";

export interface IncomingContact {
  roomId: string;
  user: UserProfile;
  totalMessages: number;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: number;
}

export interface ChatReplyInfo {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number | null;
  read: boolean;
  replyTo?: ChatReplyInfo | null;
  deletedFor?: string[];
  deletedForEveryone?: boolean;
  isEdited?: boolean;
  editedAt?: number | null;
  delivered?: boolean;
  reactions?: Record<string, string[]>;
  reactionTimestamps?: Record<string, number>;
  lastReactionEmoji?: string | null;
}

export interface ChatRoom {
  id: string; // uidA_uidB
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: number | null;
  typing?: Record<string, boolean>;
}

export function getChatRoomId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

export async function getOrCreateChatRoom(uid1: string, uid2: string): Promise<string> {
  const roomId = getChatRoomId(uid1, uid2);
  if (!isFirebaseConfigured || !db) return roomId;

  const roomRef = doc(db, "chats", roomId);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    const newRoom: ChatRoom = {
      id: roomId,
      participants: [uid1, uid2],
    };
    await setDoc(roomRef, newRoom);
  }

  return roomId;
}

export async function sendMessage(
  roomId: string,
  senderId: string,
  text: string,
  replyTo?: ChatReplyInfo | null,
  isRecipientKnownOnline?: boolean
): Promise<void> {
  const recipientUid = roomId.split("_").find((id) => id !== senderId);
  let isDelivered = Boolean(isRecipientKnownOnline);

  if (!isDelivered && recipientUid && isFirebaseConfigured && db) {
    try {
      const { getUserProfile, isUserOnline } = await import("./firestore-service");
      const recipientProfile = await getUserProfile(recipientUid);
      if (recipientProfile && isUserOnline(recipientProfile)) {
        isDelivered = true;
      }
    } catch {}
  }

  const raw = localStorage.getItem("treenest_local_chats");
  if (raw) {
    try {
      const local = JSON.parse(raw);
      if (local[roomId]) {
        if (!local[roomId].messages) local[roomId].messages = [];
        local[roomId].messages.push({
          id: `local_${Date.now()}`,
          senderId,
          text,
          timestamp: Date.now(),
          read: false,
          delivered: isDelivered,
          reactions: {},
          replyTo: replyTo || null,
          deletedFor: [],
          deletedForEveryone: false,
          isEdited: false,
        });
        local[roomId].lastMessage = text;
        local[roomId].lastMessageTime = Date.now();
        localStorage.setItem("treenest_local_chats", JSON.stringify(local));
      }
    } catch {}
  }

  if (!isFirebaseConfigured || !db) return;

  const messageData: Record<string, any> = {
    senderId,
    text,
    timestamp: serverTimestamp(),
    read: false,
    delivered: isDelivered,
    reactions: {},
    deletedFor: [],
    deletedForEveryone: false,
    isEdited: false,
  };

  if (replyTo) {
    messageData["replyTo"] = replyTo;
  }

  const messagesRef = collection(db, "chats", roomId, "messages");
  await addDoc(messagesRef, messageData);

  const roomRef = doc(db, "chats", roomId);
  await updateDoc(roomRef, {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
  });
}

export function subscribeToMessages(
  roomId: string,
  userIdOrCallback: string | ((messages: ChatMessage[]) => void),
  callbackArg?: (messages: ChatMessage[]) => void
): Unsubscribe | null {
  const currentUserId = typeof userIdOrCallback === "string" ? userIdOrCallback : undefined;
  const callback = typeof userIdOrCallback === "function" ? userIdOrCallback : callbackArg;
  if (!callback) return null;

  if (!isFirebaseConfigured || !db) {
    const raw = localStorage.getItem("treenest_local_chats");
    if (raw) {
      try {
        const local = JSON.parse(raw);
        if (local[roomId]?.messages) {
          const filtered = local[roomId].messages.filter((m: ChatMessage) => {
            // Hapus untuk semua orang: hilang dari pengirim, tampil di penerima
            if (m.deletedForEveryone && currentUserId && m.senderId === currentUserId) return false;
            if (currentUserId && m.deletedFor?.includes(currentUserId)) return false;
            return true;
          });
          callback(filtered);
        }
      } catch {}
    }
    return null;
  }

  const q = query(
    collection(db, "chats", roomId, "messages"),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const msgs: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const deletedFor = (data["deletedFor"] as string[]) || [];
      const deletedForEveryone = Boolean(data["deletedForEveryone"]);

      // Jika pesan dihapus untuk semua orang:
      // Hilang dari tampilan si pengirim, namun TETAP ditampilkan di tampilan si penerima
      if (deletedForEveryone && currentUserId && (data["senderId"] === currentUserId || deletedFor.includes(currentUserId))) {
        return;
      }

      // Abaikan jika pesan dihapus untuk diri sendiri oleh current user
      if (currentUserId && deletedFor.includes(currentUserId)) return;

      msgs.push({
        id: docSnap.id,
        senderId: data["senderId"] as string,
        text: data["text"] as string,
        timestamp: data["timestamp"]?.toMillis?.() || Date.now(),
        read: (data["read"] as boolean) || false,
        delivered: Boolean(data["delivered"]),
        reactions: (data["reactions"] as Record<string, string[]>) || {},
        reactionTimestamps: (data["reactionTimestamps"] as Record<string, number>) || {},
        lastReactionEmoji: (data["lastReactionEmoji"] as string) || null,
        replyTo: (data["replyTo"] as ChatReplyInfo) || null,
        deletedFor,
        deletedForEveryone,
        isEdited: Boolean(data["isEdited"]),
        editedAt: data["editedAt"]?.toMillis?.() || null,
      });
    });

    if (
      currentUserId &&
      snapshot.docs.some(
        (d) => d.data()["senderId"] !== currentUserId && !d.data()["delivered"]
      )
    ) {
      markMessagesAsDelivered(roomId, currentUserId);
    }

    callback(msgs);
  });
}

export async function setTypingStatus(roomId: string, uid: string, isTyping: boolean): Promise<void> {
  if (!isFirebaseConfigured || !db || !roomId || !uid) return;
  try {
    const roomRef = doc(db, "chats", roomId);
    await updateDoc(roomRef, {
      [`typing.${uid}`]: isTyping ? Date.now() : 0,
    });
  } catch (err) {
    console.warn("Could not update typing status:", err);
  }
}

export function subscribeToTypingStatus(
  roomId: string,
  callback: (typingStatus: Record<string, boolean>) => void
): Unsubscribe | null {
  if (!isFirebaseConfigured || !db || !roomId) return null;
  const roomRef = doc(db, "chats", roomId);

  return onSnapshot(roomRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as ChatRoom;
      const rawTyping = data.typing || {};
      const now = Date.now();
      const resolved: Record<string, boolean> = {};

      for (const [key, val] of Object.entries(rawTyping)) {
        if (typeof val === "number") {
          resolved[key] = val > 0 && now - val < 4500;
        } else {
          resolved[key] = Boolean(val);
        }
      }

      callback(resolved);
    }
  });
}

/** Mengambil daftar chat masuk khusus dari user yang belum saling berteman resmi */
export async function getIncomingContacts(
  currentUid: string,
  friendKeys: Set<string>
): Promise<IncomingContact[]> {
  if (!currentUid || currentUid === "guest") return [];

  const { getUserProfile } = await import("./firestore-service");

  // Local storage fallback saat offline / demo mode
  if (!isFirebaseConfigured || !db) {
    const raw = localStorage.getItem("treenest_local_chats");
    if (!raw) return [];
    try {
      const localRooms: Record<string, { participants: string[]; messages: ChatMessage[] }> = JSON.parse(raw);
      const contacts: IncomingContact[] = [];

      for (const [rId, roomData] of Object.entries(localRooms)) {
        if (!roomData.participants.includes(currentUid)) continue;
        const otherUid = roomData.participants.find((p) => p !== currentUid);
        if (!otherUid) continue;

        const otherProfile = await getUserProfile(otherUid);
        if (!otherProfile) continue;

        // Cek apakah lawan bicara adalah teman resmi
        if (
          friendKeys.has(otherProfile.uid) ||
          (otherProfile.accountId && friendKeys.has(otherProfile.accountId)) ||
          friendKeys.has(otherUid)
        ) {
          continue;
        }

        const msgs = roomData.messages || [];
        const incomingMsgs = msgs.filter((m) => m.senderId === otherUid);
        if (incomingMsgs.length === 0) continue;

        const sortedMsgs = [...msgs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const lastMsg = sortedMsgs[sortedMsgs.length - 1];

        contacts.push({
          roomId: rId,
          user: otherProfile,
          totalMessages: incomingMsgs.length,
          unreadCount: incomingMsgs.filter((m) => !m.read).length,
          lastMessage: lastMsg?.text || "",
          lastMessageTime: lastMsg?.timestamp || Date.now(),
        });
      }

      contacts.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      return contacts;
    } catch {
      return [];
    }
  }

  try {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUid)
    );
    const snap = await getDocs(q);
    const contacts: IncomingContact[] = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as ChatRoom;
      const roomId = docSnap.id;
      const otherUid = data.participants.find((p) => p !== currentUid);
      if (!otherUid) continue;

      const otherProfile = await getUserProfile(otherUid);
      if (!otherProfile) continue;

      // Filter jika lawan bicara sudah merupakan teman resmi
      if (
        friendKeys.has(otherProfile.uid) ||
        (otherProfile.accountId && friendKeys.has(otherProfile.accountId)) ||
        friendKeys.has(otherUid)
      ) {
        continue;
      }

      // Query pesan di dalam room chat
      const messagesQ = query(
        collection(db, "chats", roomId, "messages"),
        orderBy("timestamp", "desc")
      );
      const messagesSnap = await getDocs(messagesQ);
      if (messagesSnap.empty) continue;

      let totalIncomingCount = 0;
      let unreadCount = 0;

      messagesSnap.forEach((mDoc) => {
        const mData = mDoc.data();
        if (mData["senderId"] === otherUid) {
          totalIncomingCount++;
          if (!mData["read"]) unreadCount++;
        }
      });

      if (totalIncomingCount === 0) continue;

      const latestMsgDoc = messagesSnap.docs[0];
      const latestMsgData = latestMsgDoc?.data();

      const lastTimestamp =
        latestMsgData?.["timestamp"]?.toMillis?.() ||
        (typeof data.lastMessageTime === "number"
          ? data.lastMessageTime
          : (data.lastMessageTime as any)?.toMillis?.() || Date.now());

      contacts.push({
        roomId,
        user: otherProfile,
        totalMessages: totalIncomingCount,
        unreadCount,
        lastMessage: latestMsgData?.["text"] || data.lastMessage || "",
        lastMessageTime: lastTimestamp,
      });
    }

    // Urutkan yang terbaru di paling atas
    contacts.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    return contacts;
  } catch (err) {
    console.error("Error fetching incoming contacts:", err);
    return [];
  }
}

/** Menghapus 1 percakapan chat */
export async function deleteChatConversation(roomId: string): Promise<void> {
  if (!roomId) return;

  const raw = localStorage.getItem("treenest_local_chats");
  if (raw) {
    try {
      const local = JSON.parse(raw);
      delete local[roomId];
      localStorage.setItem("treenest_local_chats", JSON.stringify(local));
    } catch {}
  }

  if (!isFirebaseConfigured || !db) return;

  try {
    const messagesRef = collection(db, "chats", roomId, "messages");
    const snap = await getDocs(messagesRef);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    const roomRef = doc(db, "chats", roomId);
    await deleteDoc(roomRef);
  } catch (err) {
    console.error("Error deleting chat room:", err);
  }
}

/** Menghapus semua riwayat kontak masuk non-teman */
export async function deleteAllIncomingContacts(roomIds: string[]): Promise<void> {
  if (!roomIds || roomIds.length === 0) return;
  await Promise.all(roomIds.map((rId) => deleteChatConversation(rId)));
}

/** Mengedit teks pesan (Hanya pengirim, maksimal 90 detik) */
export async function editMessage(
  roomId: string,
  messageId: string,
  newText: string,
  currentUserId: string
): Promise<{ success: boolean; error?: string }> {
  if (!roomId || !messageId || !newText.trim() || !currentUserId) {
    return { success: false, error: "Parameter tidak lengkap" };
  }

  const trimmedText = newText.trim();

  // Local storage fallback
  const raw = localStorage.getItem("treenest_local_chats");
  if (raw) {
    try {
      const local = JSON.parse(raw);
      if (local[roomId]?.messages) {
        const target = local[roomId].messages.find((m: ChatMessage) => m.id === messageId);
        if (target) {
          if (target.senderId !== currentUserId) {
            return { success: false, error: "Hanya pengirim yang dapat mengedit pesan ini" };
          }
          if (Date.now() - (target.timestamp || 0) > 90 * 1000) {
            return { success: false, error: "Batas waktu edit (90 detik) telah terlewat" };
          }
          target.text = trimmedText;
          target.isEdited = true;
          target.editedAt = Date.now();
          localStorage.setItem("treenest_local_chats", JSON.stringify(local));
        }
      }
    } catch {}
  }

  if (!isFirebaseConfigured || !db) return { success: true };

  try {
    const msgRef = doc(db, "chats", roomId, "messages", messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) {
      return { success: false, error: "Pesan tidak ditemukan" };
    }

    const data = snap.data();
    if (data["senderId"] !== currentUserId) {
      return { success: false, error: "Hanya pengirim yang dapat mengedit pesan ini" };
    }

    const msgTimestamp = data["timestamp"]?.toMillis?.() || 0;
    // 90 seconds limit (dengan toleransi transit 5s)
    if (msgTimestamp > 0 && Date.now() - msgTimestamp > 95 * 1000) {
      return { success: false, error: "Batas waktu edit (90 detik) telah terlewat" };
    }

    await updateDoc(msgRef, {
      text: trimmedText,
      isEdited: true,
      editedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    console.error("Error editing message:", err);
    return { success: false, error: "Gagal mengedit pesan" };
  }
}

/** Menghapus 1 pesan tertentu (Hapus untuk diri sendiri ATAU Hapus untuk semua orang) */
export async function deleteSingleMessage(
  roomId: string,
  messageId: string,
  currentUserId: string,
  forEveryone: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (!roomId || !messageId || !currentUserId) {
    return { success: false, error: "Parameter tidak lengkap" };
  }

  // Local storage fallback
  const raw = localStorage.getItem("treenest_local_chats");
  if (raw) {
    try {
      const local = JSON.parse(raw);
      if (local[roomId] && local[roomId].messages) {
        if (forEveryone) {
          const target = local[roomId].messages.find((m: ChatMessage) => m.id === messageId);
          if (target && target.senderId === currentUserId && Date.now() - (target.timestamp || 0) <= 305 * 1000) {
            target.deletedForEveryone = true;
            target.text = "Pesan ini telah dihapus";
            target.deletedFor = target.deletedFor || [];
            if (!target.deletedFor.includes(currentUserId)) {
              target.deletedFor.push(currentUserId);
            }
          }
        } else {
          const target = local[roomId].messages.find((m: ChatMessage) => m.id === messageId);
          if (target) {
            target.deletedFor = target.deletedFor || [];
            if (!target.deletedFor.includes(currentUserId)) {
              target.deletedFor.push(currentUserId);
            }
          }
        }
        localStorage.setItem("treenest_local_chats", JSON.stringify(local));
      }
    } catch {}
  }

  if (!isFirebaseConfigured || !db) return { success: true };

  try {
    const msgRef = doc(db, "chats", roomId, "messages", messageId);
    
    if (forEveryone) {
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return { success: true };
      const data = snap.data();
      if (data["senderId"] !== currentUserId) {
        return { success: false, error: "Hanya pengirim yang dapat menghapus pesan untuk semua orang" };
      }
      const msgTimestamp = data["timestamp"]?.toMillis?.() || 0;
      // 5 minutes limit (300 seconds + toleransi transit 5s)
      if (msgTimestamp > 0 && Date.now() - msgTimestamp > 305 * 1000) {
        return { success: false, error: "Batas waktu hapus untuk semua orang (5 menit) telah terlewat" };
      }

      // Point 5: Hilang dari pengirim, namun urutan pesan tetap tampil di penerima sebagai "Pesan ini telah dihapus"
      await updateDoc(msgRef, {
        deletedForEveryone: true,
        deletedFor: arrayUnion(currentUserId),
        text: "Pesan ini telah dihapus",
      });
      return { success: true };
    } else {
      // Hapus untuk diri sendiri: tambahkan user ID ke array deletedFor
      await updateDoc(msgRef, {
        deletedFor: arrayUnion(currentUserId),
      });
      return { success: true };
    }
  } catch (err) {
    console.error("Error deleting single message:", err);
    return { success: false, error: "Gagal menghapus pesan" };
  }
}

/** Menambah atau membatalkan reaksi emote pada pesan tertentu */
export async function toggleMessageReaction(
  roomId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  if (!roomId || !messageId || !emoji || !userId) return;

  // Local storage fallback
  const raw = localStorage.getItem("treenest_local_chats");
  if (raw) {
    try {
      const local = JSON.parse(raw);
      if (local[roomId]?.messages) {
        const target = local[roomId].messages.find((m: ChatMessage) => m.id === messageId);
        if (target) {
          target.reactions = target.reactions || {};
          target.reactionTimestamps = target.reactionTimestamps || {};
          const alreadyHasThisEmoji = ((target.reactions[emoji] as string[]) || []).includes(userId);

          // 1 User hanya boleh punya 1 reaksi per pesan: hapus userId dari SEMUA emoji sebelumnya
          for (const key of Object.keys(target.reactions)) {
            target.reactions[key] = ((target.reactions[key] as string[]) || []).filter((id: string) => id !== userId);
            if (target.reactions[key].length === 0) {
              delete target.reactions[key];
              delete target.reactionTimestamps[key];
            }
          }

          // Jika user sebelumnya belum memilih emoji ini, pasang emoji baru! (Jika sudah, toggle off)
          if (!alreadyHasThisEmoji) {
            target.reactions[emoji] = [...((target.reactions[emoji] as string[]) || []), userId];
            target.reactionTimestamps[emoji] = Date.now();
            target.lastReactionEmoji = emoji;
          } else {
            if (target.lastReactionEmoji === emoji) {
              const remaining = Object.keys(target.reactions);
              if (remaining.length > 0) {
                remaining.sort((a, b) => (target.reactionTimestamps?.[a] || 0) - (target.reactionTimestamps?.[b] || 0));
                target.lastReactionEmoji = remaining[remaining.length - 1];
              } else {
                target.lastReactionEmoji = null;
              }
            }
          }

          localStorage.setItem("treenest_local_chats", JSON.stringify(local));
        }
      }
    } catch {}
  }

  if (!isFirebaseConfigured || !db) return;

  try {
    const msgRef = doc(db, "chats", roomId, "messages", messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const reactions = { ...((data["reactions"] as Record<string, string[]>) || {}) };
    const reactionTimestamps = { ...((data["reactionTimestamps"] as Record<string, number>) || {}) };
    const alreadyHasThisEmoji = (reactions[emoji] || []).includes(userId);

    // 1 User hanya boleh punya 1 reaksi per pesan: hapus userId dari SEMUA emoji sebelumnya
    for (const key of Object.keys(reactions)) {
      reactions[key] = (reactions[key] || []).filter((id: string) => id !== userId);
      if (reactions[key].length === 0) {
        delete reactions[key];
        delete reactionTimestamps[key];
      }
    }

    let lastReactionEmoji = data["lastReactionEmoji"] || null;

    // Jika user sebelumnya belum memilih emoji ini, pasang emoji baru! (Jika sudah, toggle off)
    if (!alreadyHasThisEmoji) {
      reactions[emoji] = [...(reactions[emoji] || []), userId];
      reactionTimestamps[emoji] = Date.now();
      lastReactionEmoji = emoji;
    } else {
      if (lastReactionEmoji === emoji) {
        const remaining = Object.keys(reactions);
        if (remaining.length > 0) {
          remaining.sort((a, b) => (reactionTimestamps[a] || 0) - (reactionTimestamps[b] || 0));
          lastReactionEmoji = remaining[remaining.length - 1];
        } else {
          lastReactionEmoji = null;
        }
      }
    }

    await updateDoc(msgRef, {
      reactions,
      reactionTimestamps,
      lastReactionEmoji,
    });
  } catch (err) {
    console.error("Error toggling reaction:", err);
  }
}

/** Menandai pesan lawan bicara sebagai sudah dibaca (read) */
export async function markMessagesAsRead(
  roomId: string,
  currentUserId: string
): Promise<void> {
  if (!roomId || !currentUserId) return;

  // Local storage fallback
  const raw = localStorage.getItem("treenest_local_chats");
  if (raw) {
    try {
      const local = JSON.parse(raw);
      if (local[roomId]?.messages) {
        let changed = false;
        local[roomId].messages.forEach((m: ChatMessage) => {
          if (m.senderId !== currentUserId && !m.read) {
            m.read = true;
            m.delivered = true;
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem("treenest_local_chats", JSON.stringify(local));
        }
      }
    } catch {}
  }

  if (!isFirebaseConfigured || !db) return;

  try {
    const messagesRef = collection(db, "chats", roomId, "messages");
    // Query sederhana 'read' == false tanpa composite index agar tidak pernah error di Firestore
    const q = query(
      messagesRef,
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    const unreadFromOther = snap.docs.filter((d) => d.data()["senderId"] !== currentUserId);
    const updates = unreadFromOther.map((d) =>
      updateDoc(d.ref, { read: true, delivered: true })
    );
    await Promise.all(updates);
  } catch (err) {
    console.warn("Could not mark messages as read:", err);
  }
}

/** Menandai pesan lawan bicara sebagai sudah sampai / delivered */
export async function markMessagesAsDelivered(
  roomId: string,
  currentUserId: string
): Promise<void> {
  if (!roomId || !currentUserId || !isFirebaseConfigured || !db) return;

  try {
    const messagesRef = collection(db, "chats", roomId, "messages");
    const q = query(
      messagesRef,
      where("delivered", "==", false)
    );
    const snap = await getDocs(q);
    const undeliveredFromOther = snap.docs.filter((d) => d.data()["senderId"] !== currentUserId);
    if (undeliveredFromOther.length === 0) return;

    const batch = writeBatch(db);
    undeliveredFromOther.forEach((d) => {
      batch.update(d.ref, { delivered: true });
    });
    await batch.commit();
  } catch (err) {
    // Abaikan jika tidak ada dokumen
  }
}

/** Menandai semua pesan masuk dari seluruh room yang belum berstatus delivered sebagai delivered */
export async function markAllIncomingAsDelivered(currentUserId: string): Promise<void> {
  if (!currentUserId || currentUserId === "guest" || !isFirebaseConfigured || !db) return;

  try {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUserId)
    );
    const snap = await getDocs(q);
    const promises = snap.docs.map((docSnap) =>
      markMessagesAsDelivered(docSnap.id, currentUserId)
    );
    await Promise.all(promises);
  } catch (err) {
    // Abaikan jika ada kendala jaringan
  }
}

/** Menghapus beberapa pesan sekaligus untuk diri sendiri (Multi-Select delete) */
export async function deleteMultipleMessages(
  roomId: string,
  messageIds: string[],
  currentUserId: string
): Promise<void> {
  if (!roomId || !messageIds || messageIds.length === 0 || !currentUserId) return;

  const idSet = new Set(messageIds);
  const raw = localStorage.getItem("treenest_local_chats");
  if (raw) {
    try {
      const local = JSON.parse(raw);
      if (local[roomId] && local[roomId].messages) {
        local[roomId].messages.forEach((m: ChatMessage) => {
          if (idSet.has(m.id)) {
            m.deletedFor = m.deletedFor || [];
            if (!m.deletedFor.includes(currentUserId)) {
              m.deletedFor.push(currentUserId);
            }
          }
        });
        localStorage.setItem("treenest_local_chats", JSON.stringify(local));
      }
    } catch {}
  }

  if (!isFirebaseConfigured || !db) return;
  try {
    const firestore = db;
    const promises = messageIds.map((mId) =>
      updateDoc(doc(firestore, "chats", roomId, "messages", mId), {
        deletedFor: arrayUnion(currentUserId),
      })
    );
    await Promise.all(promises);
  } catch (err) {
    console.error("Error deleting multiple messages:", err);
  }
}

/** Menghapus seluruh riwayat pesan untuk diri sendiri (tidak menghapus tampilan lawan bicara) */
export async function clearAllChatHistory(roomId: string, currentUserId: string): Promise<void> {
  if (!roomId || !currentUserId) return;

  const raw = localStorage.getItem("treenest_local_chats");
  if (raw) {
    try {
      const local = JSON.parse(raw);
      if (local[roomId] && local[roomId].messages) {
        local[roomId].messages.forEach((m: ChatMessage) => {
          m.deletedFor = m.deletedFor || [];
          if (!m.deletedFor.includes(currentUserId)) {
            m.deletedFor.push(currentUserId);
          }
        });
        localStorage.setItem("treenest_local_chats", JSON.stringify(local));
      }
    } catch {}
  }

  if (!isFirebaseConfigured || !db) return;
  try {
    const messagesRef = collection(db, "chats", roomId, "messages");
    const snap = await getDocs(messagesRef);
    const promises = snap.docs.map((d) =>
      updateDoc(d.ref, {
        deletedFor: arrayUnion(currentUserId),
      })
    );
    await Promise.all(promises);
  } catch (err) {
    console.error("Error clearing chat history:", err);
  }
}
