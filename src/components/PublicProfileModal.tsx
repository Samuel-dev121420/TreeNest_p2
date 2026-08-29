import { useEffect, useState } from "react";
import {
  X,
  TreePine,
  Users,
  LogIn,
  Globe,
  Lock,
  UserCheck,
  UserPlus,
  Check,
  Instagram,
  Github,
  Twitter,
} from "lucide-react";
import { stageForLevel, expNeeded } from "@/lib/treenest";
import { getUserProfile, type UserProfile } from "@/lib/firestore-service";
import { type SocialLink, type Friend, type Person } from "@/lib/social";

type Props = {
  accountId: string;
  viewerUid?: string;
  viewerFriends?: Friend[];
  onClose: () => void;
  onAddFriend?: (person?: Person) => void;
  isFriend?: boolean;
  isRequestSent?: boolean;
};

const PLATFORM_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; prefix: string }
> = {
  instagram: {
    label: "Instagram",
    icon: Instagram,
    prefix: "https://instagram.com/",
  },
  github: { label: "GitHub", icon: Github, prefix: "https://github.com/" },
  x: { label: "X", icon: Twitter, prefix: "https://x.com/" },
  tiktok: {
    label: "TikTok",
    icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.79 1.52V6.7a4.85 4.85 0 01-1.02-.01z" />
      </svg>
    ),
    prefix: "https://tiktok.com/@",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
    prefix: "https://wa.me/",
  },
};

function SocialLinkBadge({ link }: { link: SocialLink }) {
  const meta = PLATFORM_META[link.platform];
  if (!meta) return null;
  const Icon = meta.icon;
  const href = link.platform === "whatsapp"
    ? `${meta.prefix}${link.value.replace(/\D/g, "")}`
    : `${meta.prefix}${link.value.replace(/^@/, "")}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
    >
      <Icon className="size-3.5 text-muted-foreground" />
      <span>{link.value}</span>
    </a>
  );
}

export function PublicProfileModal({
  accountId,
  viewerUid,
  viewerFriends = [],
  onClose,
  onAddFriend,
  isFriend = false,
  isRequestSent = false,
}: Props) {
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(isRequestSent);
  const [showFullAvatar, setShowFullAvatar] = useState(false);

  useEffect(() => {
    // Find profile by accountId or uid from Firestore
    import("@/lib/firestore-service")
      .then(async ({ searchUserByAccountId, getUserProfile }) => {
        let found = await searchUserByAccountId(accountId);
        if (!found) {
          found = await getUserProfile(accountId);
        }
        return found;
      })
      .then((found) => {
        if (found) {
          setTargetProfile(found);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accountId]);

  const handleAddClick = () => {
    if (!targetProfile || requestSent) return;
    setRequestSent(true);
    if (onAddFriend) {
      onAddFriend({
        uid: targetProfile.uid,
        accountId: targetProfile.accountId,
        name: targetProfile.username,
        initials: targetProfile.initials || targetProfile.username.slice(0, 2).toUpperCase(),
        hue: targetProfile.hue,
        avatarUrl: targetProfile.avatarUrl,
      });
    }
  };

  const userLevel = Math.min(20, targetProfile?.level || 1);
  const isOwner = targetProfile?.uid === viewerUid;
  const stage = targetProfile ? stageForLevel(userLevel) : null;
  const need = targetProfile ? expNeeded(userLevel) : 50;
  const expPct = targetProfile ? Math.min(100, Math.round(((targetProfile.exp || 0) / need) * 100)) : 0;

  // Filter social links based on viewer relationship
  const visibleSocialLinks = (targetProfile?.socialLinks || []).filter((link) => {
    if (isOwner) return true;
    if (link.visibility === "public") return true;
    if (link.visibility === "friends_only") {
      return isFriend || viewerFriends.some((f) => f.accountId === targetProfile?.accountId);
    }
    return false;
  });

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-border/80 bg-card shadow-float animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header banner */}
        <div className="h-16 bg-gradient-leaf" />

        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-black/20 p-1.5 text-white backdrop-blur-sm hover:bg-black/30"
        >
          <X className="size-4" />
        </button>

        <div className="px-5 pb-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Memuat profil...</div>
          ) : !targetProfile ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Profil tidak ditemukan.
            </div>
          ) : (
            <>
              {/* Avatar + basic info */}
              <div className="-mt-10 flex items-end justify-between">
                <button
                  type="button"
                  onClick={() => setShowFullAvatar(true)}
                  title="Klik untuk melihat foto profil ukuran besar"
                  className="group relative cursor-pointer outline-none transition-transform hover:scale-105 active:scale-95 text-left"
                >
                  {targetProfile.avatarUrl ? (
                    <img
                      src={targetProfile.avatarUrl}
                      alt={targetProfile.username}
                      className="size-20 rounded-full object-cover shadow-float ring-4 ring-card group-hover:ring-primary/60 transition-all"
                    />
                  ) : (
                    <span
                      className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-primary-foreground shadow-float ring-4 ring-card group-hover:ring-primary/60 transition-all"
                      style={{
                        backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${targetProfile.hue}), oklch(0.66 0.13 ${targetProfile.hue + 25}))`,
                      }}
                    >
                      {targetProfile.initials}
                    </span>
                  )}
                </button>

                <div className="flex gap-2 pt-10 pb-1">
                  {!isOwner && !isFriend && onAddFriend && !requestSent && (
                    <button
                      onClick={handleAddClick}
                      className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 shadow-soft"
                    >
                      <UserPlus className="size-3.5" /> Tambah
                    </button>
                  )}
                  {!isOwner && !isFriend && requestSent && (
                    <span className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground opacity-80 shadow-xs cursor-default">
                      <Check className="size-3.5 text-primary" /> Terkirim
                    </span>
                  )}
                  {!isOwner && isFriend && (
                    <span className="flex items-center gap-1.5 rounded-xl bg-leaf/10 px-3 py-2 text-xs font-bold text-leaf">
                      <UserCheck className="size-3.5" /> Teman
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <h2 className="text-xl font-bold text-foreground">{targetProfile.username}</h2>
                <p className="text-xs text-muted-foreground">ID {targetProfile.accountId}</p>
                {targetProfile.bio && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{targetProfile.bio}</p>
                )}
              </div>

              {/* Stats row */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center rounded-2xl bg-secondary/50 py-3 text-center">
                  <TreePine className="size-4 text-leaf" />
                  <p className="mt-1 text-sm font-bold text-foreground">Lv {userLevel}</p>
                  <p className="text-[10px] text-muted-foreground">{stage?.label?.split(" (")[0]}</p>
                </div>
                <div className="flex flex-col items-center rounded-2xl bg-secondary/50 py-3 text-center">
                  <Users className="size-4 text-sky-deep" />
                  <p className="mt-1 text-sm font-bold text-foreground">{targetProfile.friendCount || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Teman</p>
                </div>
                <div className="flex flex-col items-center rounded-2xl bg-secondary/50 py-3 text-center">
                  <LogIn className="size-4 text-sun" />
                  <p className="mt-1 text-sm font-bold text-foreground">{targetProfile.totalLogins || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Login</p>
                </div>
              </div>

              {/* EXP bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>EXP</span>
                  <span>{targetProfile.exp || 0} / {need}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-leaf transition-all duration-500"
                    style={{ width: `${expPct}%` }}
                  />
                </div>
              </div>

              {/* Social links */}
              {visibleSocialLinks.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Globe className="size-3" /> Sosial Media
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {visibleSocialLinks.map((link) => (
                      <SocialLinkBadge key={link.platform} link={link} />
                    ))}
                  </div>
                </div>
              )}

              {visibleSocialLinks.length === 0 && !isOwner && (
                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Lock className="size-3" /> Sosial media disembunyikan atau tidak ada.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── MODAL FOTO PROFIL UKURAN BESAR (FULL-SIZE AVATAR LIGHTBOX) ── */}
      {showFullAvatar && targetProfile && (
        <div
          onClick={() => setShowFullAvatar(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm sm:max-w-md w-full flex flex-col items-center gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-float text-center animate-in zoom-in-95 duration-150"
          >
            <button
              onClick={() => setShowFullAvatar(false)}
              className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 cursor-pointer transition-colors"
            >
              <X className="size-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-foreground">Foto Profil - {targetProfile.username}</h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                (ID: {targetProfile.accountId})
              </p>
            </div>

            <div className="relative flex items-center justify-center p-4">
              {targetProfile.avatarUrl ? (
                <img
                  src={targetProfile.avatarUrl}
                  alt={targetProfile.username}
                  className="size-64 sm:size-72 rounded-full object-cover ring-2 ring-black/80 dark:ring-white/80 shadow-[0_0_32px_8px_rgba(var(--primary-rgb,74,222,128),0.35)] dark:shadow-[0_0_36px_10px_rgba(var(--primary-rgb,74,222,128),0.45)]"
                />
              ) : (
                <span
                  className="flex size-64 sm:size-72 items-center justify-center rounded-full text-6xl font-extrabold text-primary-foreground ring-2 ring-black/80 dark:ring-white/80 shadow-[0_0_32px_8px_rgba(var(--primary-rgb,74,222,128),0.35)] dark:shadow-[0_0_36px_10px_rgba(var(--primary-rgb,74,222,128),0.45)]"
                  style={{
                    backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${targetProfile.hue}), oklch(0.66 0.13 ${targetProfile.hue + 25}))`,
                  }}
                >
                  {targetProfile.initials}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowFullAvatar(false)}
              className="w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer shadow-soft"
            >
              Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
