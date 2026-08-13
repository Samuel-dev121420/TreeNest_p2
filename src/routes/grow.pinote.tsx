import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Folder,
  FileText,
  FileCode,
  FileImage,
  Video,
  File,
  Plus,
  Trash2,
  Search,
  ChevronRight,
  Upload,
  Download,
  Eye,
  Edit2,
  X,
  ArrowLeft,
  HardDrive,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ToolHeader } from "@/components/ToolHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  generateId,
  formatBytes,
  type PinoteItem,
  type PinoteItemType,
  type PinoteFolder,
  type PinoteNote,
} from "@/lib/grow-tools";
import { useAuth } from "@/lib/auth-context";
import { awardActivityExp } from "@/lib/exp-service";

export const Route = createFileRoute("/grow/pinote")({
  head: () => ({
    meta: [
      { title: "PiNote — Explorer & Catatan TreeNest" },
      {
        name: "description",
        content: "File explorer & catatan berjenjang tanpa batas ala ZArchiver di TreeNest.",
      },
      { property: "og:title", content: "PiNote — Explorer & Catatan TreeNest" },
      {
        property: "og:description",
        content: "File explorer & catatan berjenjang tanpa batas ala ZArchiver di TreeNest.",
      },
    ],
  }),
  component: PiNotePage,
});

export function PiNotePage() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";

  const [items, setItems] = useLocalStorage<PinoteItem[]>(`treenest.pinote.items_v2.${uid}`, []);
  const [legacyFolders, setLegacyFolders] = useLocalStorage<PinoteFolder[]>(`treenest.pinote.folders.${uid}`, []);
  const [legacyNotes, setLegacyNotes] = useLocalStorage<PinoteNote[]>(`treenest.pinote.notes.${uid}`, []);
  const [hasMigrated, setHasMigrated] = useLocalStorage<boolean>(
    `treenest.pinote.migrated_v2.${uid}`,
    false,
  );

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Active state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [editingNoteItem, setEditingNoteItem] = useState<PinoteItem | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const [previewItem, setPreviewItem] = useState<PinoteItem | null>(null);
  const [renamingItem, setRenamingItem] = useState<PinoteItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-migrate legacy data once on first load
  useEffect(() => {
    if (!hasMigrated) {
      if (legacyFolders.length > 0 || legacyNotes.length > 0) {
        const migrated: PinoteItem[] = [];
        const folderIdMap = new Map<string, string>();

        legacyFolders.forEach((f) => {
          const newId = generateId();
          folderIdMap.set(f.id, newId);
          migrated.push({
            id: newId,
            parentId: null,
            name: f.name,
            type: "folder",
            createdAt: f.createdAt || Date.now(),
            updatedAt: f.createdAt || Date.now(),
          });
        });

        legacyNotes.forEach((n) => {
          const parentId = folderIdMap.get(n.folderId) || null;
          migrated.push({
            id: generateId(),
            parentId,
            name: n.title || "Catatan",
            type: "note",
            content: n.content,
            createdAt: n.updatedAt || Date.now(),
            updatedAt: n.updatedAt || Date.now(),
          });
        });

        setItems((prev) => (prev.length === 0 ? migrated : prev));
        setLegacyFolders([]);
        setLegacyNotes([]);
      }
      setHasMigrated(true);
    }
  }, [
    hasMigrated,
    legacyFolders,
    legacyNotes,
    setItems,
    setLegacyFolders,
    setLegacyNotes,
    setHasMigrated,
  ]);

  // Compute Breadcrumb Trail
  const breadcrumbs = useMemo(() => {
    const trail: { id: string | null; name: string }[] = [{ id: null, name: "Root" }];
    let currId = currentFolderId;
    const visited = new Set<string>();

    const chain: { id: string; name: string }[] = [];
    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const folder = items.find((i) => i.id === currId && i.type === "folder");
      if (!folder) break;
      chain.unshift({ id: folder.id, name: folder.name });
      currId = folder.parentId;
    }

    return [...trail, ...chain];
  }, [currentFolderId, items]);

  // Compute displayed items (Current Folder or Global Search)
  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.content && item.content.toLowerCase().includes(q)),
      );
    }
    return items
      .filter((item) => item.parentId === currentFolderId)
      .sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [items, currentFolderId, searchQuery]);

  // Actions
  function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const newItem: PinoteItem = {
      id: generateId(),
      parentId: currentFolderId,
      name,
      type: "folder",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setItems((prev) => [newItem, ...prev]);
    setNewFolderName("");
    setIsCreatingFolder(false);
  }

  function handleOpenCreateNote() {
    const newNote: PinoteItem = {
      id: generateId(),
      parentId: currentFolderId,
      name: "Catatan Baru",
      type: "note",
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setItems((prev) => [newNote, ...prev]);
    setEditingNoteItem(newNote);
    setNoteTitle(newNote.name);
    setNoteContent("");
  }

  function handleSaveNote() {
    if (!editingNoteItem) return;
    const title = noteTitle.trim() || "Catatan Tanpa Judul";
    setItems((prev) =>
      prev.map((item) =>
        item.id === editingNoteItem.id
          ? { ...item, name: title, content: noteContent, updatedAt: Date.now() }
          : item,
      ),
    );
    if (uid !== "guest") awardActivityExp(uid, "pinote_note");
    setEditingNoteItem(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 10MB to keep localStorage safe)
    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran file maksimal 10 MB untuk penyimpanan lokal.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      let fileType = "document";
      if (file.type.startsWith("image/")) fileType = "image";
      else if (file.type.startsWith("video/")) fileType = "video";
      else if (file.type.includes("pdf")) fileType = "pdf";

      const newItem: PinoteItem = {
        id: generateId(),
        parentId: currentFolderId,
        name: file.name,
        type: "file",
        fileUrl: dataUrl,
        fileType,
        fileSize: file.size,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setItems((prev) => [newItem, ...prev]);
      if (uid !== "guest") awardActivityExp(uid, "pinote_file");
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRenameItem() {
    if (!renamingItem) return;
    const name = renameValue.trim();
    if (!name) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === renamingItem.id ? { ...item, name, updatedAt: Date.now() } : item,
      ),
    );
    setRenamingItem(null);
  }

  function handleDeleteItem(item: PinoteItem) {
    if (!confirm(`Hapus "${item.name}"${item.type === "folder" ? " dan seluruh isinya?" : "?"}`)) {
      return;
    }

    // Recursive helper to get all child IDs
    function getAllChildIds(parentId: string): string[] {
      const children = items.filter((i) => i.parentId === parentId);
      let ids: string[] = [];
      for (const child of children) {
        ids.push(child.id);
        if (child.type === "folder") {
          ids = [...ids, ...getAllChildIds(child.id)];
        }
      }
      return ids;
    }

    const idsToDelete = new Set([
      item.id,
      ...(item.type === "folder" ? getAllChildIds(item.id) : []),
    ]);
    if (currentFolderId && idsToDelete.has(currentFolderId)) {
      setCurrentFolderId(null);
    }
    setItems((prev) => prev.filter((i) => !idsToDelete.has(i.id)));
  }

  // Get item icon
  function getItemIcon(item: PinoteItem) {
    if (item.type === "folder")
      return <Folder className="size-6 text-amber-500 fill-amber-500/20" />;
    if (item.type === "note") return <FileText className="size-6 text-emerald-500" />;
    if (item.fileType === "image") return <FileImage className="size-6 text-purple-500" />;
    if (item.fileType === "video") return <Video className="size-6 text-rose-500" />;
    if (item.fileType === "pdf") return <FileCode className="size-6 text-red-500" />;
    return <File className="size-6 text-blue-500" />;
  }

  return (
    <PageShell title="" description="">
      <ToolHeader
        title="PiNote Explorer"
        description="Pengelola folder bersarang, catatan, dan file dokumen ala ZArchiver."
      />

      <div className="mx-auto max-w-5xl space-y-4">
        {/* Top Control Bar: Search & Actions */}
        <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari folder, catatan, atau file..."
              className="w-full rounded-2xl border border-input bg-background py-2.5 pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
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

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
            >
              <Folder className="size-4 text-amber-500" /> + Folder
            </button>
            <button
              onClick={handleOpenCreateNote}
              className="flex items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              <FileText className="size-4 text-emerald-500" /> + Catatan
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-2xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Upload className="size-4" /> Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,video/*,application/pdf,text/*,.doc,.docx,.ppt,.pptx"
            />
          </div>
        </div>

        {/* Breadcrumb Navigation Trail */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/60 bg-card/60 px-4 py-2 text-sm">
            <HardDrive className="size-4 shrink-0 text-muted-foreground" />
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div key={crumb.id || "root"} className="flex items-center gap-1 shrink-0">
                  {idx > 0 && <ChevronRight className="size-3.5 text-muted-foreground/60" />}
                  <button
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={`rounded-lg px-2 py-1 transition-colors ${
                      isLast
                        ? "font-bold text-foreground bg-primary/10"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {crumb.name}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Search Results Indicator */}
        {searchQuery && (
          <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
            <span>
              Hasil pencarian untuk "<strong>{searchQuery}</strong>" ({displayedItems.length} item
              ditemukan)
            </span>
            <button
              onClick={() => setSearchQuery("")}
              className="font-bold text-primary hover:underline"
            >
              Kembali ke Explorer
            </button>
          </div>
        )}

        {/* File Explorer Content Area */}
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-soft min-h-[22rem]">
          {displayedItems.length === 0 ? (
            <EmptyState
              icon={Folder}
              title={searchQuery ? "Tidak ditemukan" : "Folder Kosong"}
              description={
                searchQuery
                  ? "Coba kata kunci lain."
                  : "Buat folder baru, catatan teks, atau upload file dokumen."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {displayedItems.map((item) => {
                const isFolder = item.type === "folder";
                const isNote = item.type === "note";

                // Calculate sub-item count if folder
                const childCount = isFolder
                  ? items.filter((i) => i.parentId === item.id).length
                  : 0;

                return (
                  <div
                    key={item.id}
                    className="group relative flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background p-3.5 transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    {/* Main Clickable Item Info */}
                    <button
                      onClick={() => {
                        if (isFolder) {
                          setCurrentFolderId(item.id);
                          setSearchQuery("");
                        } else if (isNote) {
                          setEditingNoteItem(item);
                          setNoteTitle(item.name);
                          setNoteContent(item.content || "");
                        } else {
                          setPreviewItem(item);
                        }
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted/70">
                        {getItemIcon(item)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {isFolder
                            ? `${childCount} item`
                            : isNote
                              ? "Catatan Teks"
                              : formatBytes(item.fileSize)}
                          {" • "}
                          {new Date(item.updatedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </button>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1">
                      {item.type === "file" && item.fileUrl && (
                        <a
                          href={item.fileUrl}
                          download={item.name}
                          className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Unduh file"
                        >
                          <Download className="size-4" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setRenamingItem(item);
                          setRenameValue(item.name);
                        }}
                        className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Ganti nama"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="rounded-xl p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Hapus"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Folder */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-5 shadow-lg">
            <h3 className="text-base font-bold text-foreground">Buat Folder Baru</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Folder akan dibuat di dalam posisi explorer saat ini.
            </p>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              placeholder="Nama folder..."
              className="mt-4 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName("");
                }}
                className="rounded-xl border border-border/70 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Buat Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rename Item */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-5 shadow-lg">
            <h3 className="text-base font-bold text-foreground">Ubah Nama</h3>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameItem()}
              className="mt-4 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRenamingItem(null)}
                className="rounded-xl border border-border/70 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={handleRenameItem}
                disabled={!renameValue.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Editor: Text Note Editor */}
      {editingNoteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex h-full max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-border/80 bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-emerald-500" />
                <span className="text-sm font-bold text-foreground">Editor Catatan</span>
              </div>
              <button
                onClick={() => setEditingNoteItem(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-4 flex flex-1 flex-col gap-3">
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Judul Catatan"
                className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-base font-bold outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Tulis isi catatanmu di sini..."
                className="min-h-0 flex-1 resize-none rounded-2xl border border-input bg-background p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-border/60 pt-3">
              <button
                onClick={() => setEditingNoteItem(null)}
                className="rounded-xl border border-border/70 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={handleSaveNote}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Media / Document Previewer */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="flex h-full max-h-[85vh] w-full max-w-3xl flex-col rounded-3xl border border-border/80 bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                {getItemIcon(previewItem)}
                <span className="truncate text-sm font-bold text-foreground">
                  {previewItem.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {previewItem.fileUrl && (
                  <a
                    href={previewItem.fileUrl}
                    download={previewItem.name}
                    className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                  >
                    <Download className="size-3.5" /> Unduh
                  </a>
                )}
                <button
                  onClick={() => setPreviewItem(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black/10 p-2">
              {previewItem.fileType === "image" && previewItem.fileUrl ? (
                <img
                  src={previewItem.fileUrl}
                  alt={previewItem.name}
                  className="max-h-full max-w-full rounded-xl object-contain"
                />
              ) : previewItem.fileType === "video" && previewItem.fileUrl ? (
                <video
                  src={previewItem.fileUrl}
                  controls
                  className="max-h-full max-w-full rounded-xl"
                />
              ) : previewItem.fileType === "pdf" && previewItem.fileUrl ? (
                <iframe
                  src={previewItem.fileUrl}
                  title={previewItem.name}
                  className="h-full w-full rounded-xl border-none"
                />
              ) : (
                <div className="p-8 text-center">
                  <File className="mx-auto size-16 text-muted-foreground/60" />
                  <p className="mt-3 text-sm font-semibold text-foreground">{previewItem.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pratinjau langsung tidak tersedia untuk format file ini. Klik tombol unduh di
                    atas untuk membuka file.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
