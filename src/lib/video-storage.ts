// IndexedDB Persistent Video Storage for TreeGallery

const DB_NAME = "TreeNestMediaDB";
const DB_VERSION = 1;
const STORE_NAME = "videos";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Simpan file video blob ke IndexedDB agar tidak hilang saat refresh */
export async function saveVideoBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, blob, createdAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to save video to IndexedDB:", err);
  }
}

/** Ambil file video blob dari IndexedDB */
export async function getVideoBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to get video from IndexedDB:", err);
    return null;
  }
}

/** Hapus file video dari IndexedDB */
export async function deleteVideoBlob(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to delete video from IndexedDB:", err);
  }
}

/** Resolve video URL yang aman: jika indexeddb://, ambil blob dan buat ObjectURL baru */
export async function resolveVideoUrl(url: string, videoId?: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("indexeddb:")) {
    const id = url.replace("indexeddb:", "") || videoId;
    if (id) {
      const blob = await getVideoBlob(id);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    }
  }
  // Jika URL blob lama yang sudah expired, coba cari di IndexedDB pakai videoId
  if (url.startsWith("blob:") && videoId) {
    const blob = await getVideoBlob(videoId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
  }
  return url;
}
