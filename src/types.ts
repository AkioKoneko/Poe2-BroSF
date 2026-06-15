export type UserId = string;

export type AscendancyId =
  | "spirit-walker"
  | "stormweaver"
  | "infernalist"
  | "martial-artist"
  | "invoker"
  | "acolyte-of-chayula"
  | "amazon"
  | "ritualist"
  | "deadeye"
  | "pathfinder"
  | "tactician"
  | "witchhunter"
  | "gemling-legionnaire"
  | "titan"
  | "warbringer"
  | "smith-of-kitava"
  | "blood-mage"
  | "lich"
  | "chronomancer"
  | "disciple-of-varashta";

export type WishKind =
  | "unique"
  | "currency"
  | "gem"
  | "support"
  | "tablet"
  | "rare";

export type WishPriority = "low" | "normal" | "high" | "urgent";

export type SortMode =
  | "newest"
  | "oldest"
  | "account"
  | "type"
  | "priority"
  | "unclaimed";

export interface AscendancyOption {
  id: AscendancyId;
  name: string;
  characterClass: string;
  icon: string;
}

export interface BuildProfile {
  id: string;
  characterName: string;
  buildName: string;
  ascendancyId: AscendancyId;
}

export interface Player {
  id: UserId;
  accountName: string;
  initials: string;
  activeBuildId: string;
  builds: BuildProfile[];
}

export interface PropertyLine {
  label: string;
  value: string;
}

export interface Wish {
  id: string;
  ownerId: UserId;
  buildId: string;
  name: string;
  baseType: string;
  kind: WishKind;
  priority: WishPriority;
  addedOrder: number;
  quantity?: number;
  sourceUrl?: string;
  dropSource?: string;
  icon?: string;
  note?: string;
  requirements?: string[];
  properties?: PropertyLine[];
  metaLines?: string[];
  descriptionLines?: string[];
  explicitMods?: string[];
  desiredMods?: string[];
  mustHaveAffixes?: string[];
  niceAffixes?: string[];
  flavourLines?: string[];
  footerLine?: string;
}

export type ClaimState = Record<string, UserId[]>;

export interface DraftWish {
  kind: "unique" | "currency" | "tablet" | "gem" | "rare";
  gemFlavor: "skill" | "support";
  name: string;
  baseType: string;
  sourceUrl: string;
  dropSource: string;
  icon: string;
  quantity: string;
  priority: WishPriority;
  note: string;
  metaLines: string;
  requirements: string;
  properties: string;
  descriptionLines: string;
  explicitMods: string;
  desiredMods: string;
  mustHaveAffixes: string;
  niceAffixes: string;
  flavourLines: string;
  footerLine: string;
}
