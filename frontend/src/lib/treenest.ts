import tree1 from "@/assets/tree-1.png";
import tree2 from "@/assets/tree-2.png";
import tree3 from "@/assets/tree-3.png";
import tree4 from "@/assets/tree-4.png";
import tree5 from "@/assets/tree-5.png";

export type TreeStage = {
  key: string;
  label: string;
  image: string;
  /** tinggi relatif terhadap area pohon (dalam %) */
  height: number;
};

export const TREE_STAGES: TreeStage[] = [
  { key: "seedling", label: "Seedling (Benih)", image: tree1, height: 22 },
  { key: "young_tree", label: "Young Tree (Pohon Muda)", image: tree2, height: 38 },
  { key: "growing_tree", label: "Growing Tree (Pohon Tumbuh)", image: tree3, height: 60 },
  { key: "mature_tree", label: "Mature Tree (Pohon Dewasa)", image: tree4, height: 78 },
  { key: "house_tree", label: "House Tree (Rumah Pohon)", image: tree5, height: 92 },
];

/** Wujud pohon berdasarkan level (1-20+). */
export function stageForLevel(level: number): TreeStage {
  if (level <= 5) return TREE_STAGES[0]!;
  if (level <= 10) return TREE_STAGES[1]!;
  if (level <= 15) return TREE_STAGES[2]!;
  if (level <= 19) return TREE_STAGES[3]!;
  return TREE_STAGES[4]!;
}

/** Batas EXP tiap level: 50 EXP; naik level mereset EXP ke 0. */
export function expNeeded(_level: number): number {
  return 50;
}

export const TREEHOUSE_LEVEL = 20;

export type FriendOrb = {
  id: string;
  name: string;
  initials: string;
  hue: number;
};

/** Data contoh sementara (nanti diganti data akun asli). */
export const DEMO_USER = {
  username: "Rafi",
  accountId: "TN-4821",
  initials: "RA",
  hue: 150,
  avatarUrl: "",
  level: 8,
  exp: 32,
};

export const DEMO_FRIENDS: FriendOrb[] = [
  { id: "1", name: "Nadia", initials: "NA", hue: 200 },
  { id: "2", name: "Bima", initials: "BI", hue: 140 },
  { id: "3", name: "Sari", initials: "SA", hue: 60 },
];
