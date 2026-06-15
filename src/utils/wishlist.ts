import type {
  AscendancyId,
  AscendancyOption,
  BuildProfile,
  ClaimState,
  DraftWish,
  Player,
  SortMode,
  UserId,
  Wish,
  WishKind,
  WishPriority,
} from "../types";

export const priorityLabel: Record<WishPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const kindLabel: Record<WishKind, string> = {
  unique: "Unique",
  currency: "Currency",
  gem: "Gem",
  support: "Support",
  tablet: "Tablet",
  rare: "Rare template",
};

export function buildAscendancyMap(
  ascendancies: AscendancyOption[],
): Map<AscendancyId, AscendancyOption> {
  return new Map(ascendancies.map((ascendancy) => [ascendancy.id, ascendancy]));
}

export function getActiveBuild(player: Player): BuildProfile {
  return (
    player.builds.find((build) => build.id === player.activeBuildId) ??
    player.builds[0] ?? {
      id: "default",
      characterName: "",
      buildName: "Untitled build",
      ascendancyId: "spirit-walker",
    }
  );
}

export function getWishBuild(wish: Wish, owner: Player): BuildProfile {
  return owner.builds.find((build) => build.id === wish.buildId) ?? getActiveBuild(owner);
}

export function getBuildOptions(players: Player[]): Array<{
  player: Player;
  build: BuildProfile;
}> {
  return players.flatMap((player) =>
    player.builds.map((build) => ({ player, build })),
  );
}

const priorityRank: Record<WishPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function buildPlayerMap(players: Player[]): Map<UserId, Player> {
  return new Map(players.map((player) => [player.id, player]));
}

export function getPlayerWishCounts(wishes: Wish[]): Map<UserId, number> {
  const counts = new Map<UserId, number>();
  for (const wish of wishes) {
    counts.set(wish.ownerId, (counts.get(wish.ownerId) ?? 0) + 1);
  }
  return counts;
}

export function getBuildWishCounts(wishes: Wish[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const wish of wishes) {
    counts.set(wish.buildId, (counts.get(wish.buildId) ?? 0) + 1);
  }
  return counts;
}

export function getClaimers(claims: ClaimState, wishId: string): UserId[] {
  return claims[wishId] ?? [];
}

export function isClaimedBy(
  claims: ClaimState,
  wishId: string,
  userId: UserId,
): boolean {
  return getClaimers(claims, wishId).includes(userId);
}

export function sortWishes(
  wishes: Wish[],
  sortMode: SortMode,
  claims: ClaimState,
  playersById: Map<UserId, Player>,
): Wish[] {
  const list = [...wishes];
  const claimCount = (wish: Wish) => getClaimers(claims, wish.id).length;
  const playerName = (wish: Wish) => {
    const owner = playersById.get(wish.ownerId);
    const build = owner ? getWishBuild(wish, owner) : null;
    return `${owner?.accountName ?? wish.ownerId} ${build?.buildName ?? ""}`;
  };

  list.sort((a, b) => {
    switch (sortMode) {
      case "oldest":
        return a.addedOrder - b.addedOrder;
      case "account":
        return playerName(a).localeCompare(playerName(b));
      case "type":
        return a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name);
      case "priority":
        return priorityRank[a.priority] - priorityRank[b.priority];
      case "unclaimed":
        return claimCount(a) - claimCount(b);
      case "newest":
      default:
        return b.addedOrder - a.addedOrder;
    }
  });

  return list;
}

export function filterWishes(
  wishes: Wish[],
  query: string,
  activeBuildIds: string[],
  playersById: Map<UserId, Player>,
): Wish[] {
  const normalized = query.trim().toLowerCase();
  const activeBuilds = new Set(activeBuildIds);
  return wishes.filter((wish) => {
    if (activeBuilds.size > 0 && !activeBuilds.has(wish.buildId)) return false;
    if (!normalized) return true;

    const owner = playersById.get(wish.ownerId);
    const wishBuild = owner ? getWishBuild(wish, owner) : null;
    return [
      wish.name,
      wish.baseType,
      wish.kind,
      wish.dropSource ?? "",
      owner?.accountName ?? "",
      wishBuild?.buildName ?? "",
      wishBuild?.characterName ?? "",
      wish.note ?? "",
      ...(wish.requirements ?? []),
      ...(wish.metaLines ?? []),
      ...(wish.descriptionLines ?? []),
      ...(wish.explicitMods ?? []),
      ...(wish.desiredMods ?? []),
      ...(wish.mustHaveAffixes ?? []),
      ...(wish.niceAffixes ?? []),
    ].some((part) => part.toLowerCase().includes(normalized));
  });
}

export interface WishCardTextBlock {
  label: string;
  text: string;
  tone: "note" | "poe" | "wanted";
}

export function getWishCardTexts(wish: Wish): WishCardTextBlock[] {
  const first = (lines?: string[]) => lines?.find(Boolean);
  const blocks: WishCardTextBlock[] = [];

  if (wish.note) {
    blocks.push({ label: "Comment", text: wish.note, tone: "note" });
  }

  if (wish.dropSource) {
    blocks.push({ label: "Drops from", text: wish.dropSource, tone: "wanted" });
  }

  const mustHave = first(wish.mustHaveAffixes);
  const desired = first(wish.desiredMods);
  const nice = first(wish.niceAffixes);

  if (mustHave) {
    blocks.push({ label: "Must-have", text: mustHave, tone: "wanted" });
  } else if (desired) {
    blocks.push({
      label: wish.kind === "tablet" ? "Tablet props" : "Wanted",
      text: desired,
      tone: "wanted",
    });
  } else if (nice) {
    blocks.push({ label: "Nice-to-have", text: nice, tone: "wanted" });
  }

  const poeText = first(wish.descriptionLines) ?? first(wish.explicitMods);
  if (poeText && blocks.length < 2) {
    blocks.push({ label: "PoE2DB", text: poeText, tone: "poe" });
  }

  return blocks.slice(0, 2);
}

export function toggleClaim(
  claims: ClaimState,
  wishId: string,
  userId: UserId,
): ClaimState {
  const current = claims[wishId] ?? [];
  const next = current.includes(userId)
    ? current.filter((id) => id !== userId)
    : [...current, userId];

  return {
    ...claims,
    [wishId]: next,
  };
}

function resolveDraftKind(draft: DraftWish): WishKind {
  return (draft.kind === "gem" ? draft.gemFlavor : draft.kind) as WishKind;
}

function splitDraftLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDraftProperties(value: string): Array<{ label: string; value: string }> {
  return splitDraftLines(value).map((line) => {
    const index = line.indexOf(":");
    if (index === -1) return { label: line, value: "" };
    return {
      label: line.slice(0, index).trim(),
      value: line.slice(index + 1).trim(),
    };
  });
}

function formatDraftProperties(properties: Wish["properties"]): string {
  return (properties ?? [])
    .map((property) =>
      property.value ? `${property.label}: ${property.value}` : property.label,
    )
    .join("\n");
}

function getFallbackIcon(kind: WishKind): string | undefined {
  const iconBase = `${import.meta.env.BASE_URL}poe2db-icons/`;
  const fallbackIcon: Partial<Record<WishKind, string>> = {
    unique: `${iconBase}sylvans-effigy.webp`,
    currency: `${iconBase}masterwork-rune.webp`,
    gem: `${iconBase}tame-beast.webp`,
    support: `${iconBase}atziris-communion.webp`,
    tablet: `${iconBase}precursor-tablet.webp`,
  };

  return fallbackIcon[kind];
}

function getDraftQuantity(draft: DraftWish): number | undefined {
  return draft.kind === "currency" || draft.kind === "tablet"
    ? Number(draft.quantity) || 1
    : undefined;
}

function getDraftName(draft: DraftWish): string {
  const trimmedName = draft.name.trim();
  return trimmedName || (draft.kind === "rare" ? "Rare Template" : "Untitled wish");
}

function getDraftBaseType(draft: DraftWish, kind: WishKind): string {
  const syncedBaseType = draft.baseType.trim();
  if (syncedBaseType) return syncedBaseType;
  if (draft.kind === "rare") return "Rare Template";
  if (draft.kind === "tablet") return "Precursor Tablet";
  if (draft.kind === "gem") {
    return kind === "support" ? "Support Gem" : "Skill Gem";
  }
  if (draft.kind === "currency") return "Currency / Rune";
  return "Catalog Item";
}

export function draftFromWish(wish: Wish): DraftWish {
  return {
    kind: wish.kind === "support" ? "gem" : wish.kind,
    gemFlavor: wish.kind === "support" ? "support" : "skill",
    name: wish.name,
    baseType: wish.baseType,
    sourceUrl: wish.sourceUrl ?? "",
    dropSource: wish.dropSource ?? "",
    icon: wish.icon ?? "",
    quantity: String(wish.quantity ?? 1),
    priority: wish.priority,
    note: wish.note ?? "",
    metaLines: (wish.metaLines ?? []).join("\n"),
    requirements: (wish.requirements ?? []).join("\n"),
    properties: formatDraftProperties(wish.properties),
    descriptionLines: (wish.descriptionLines ?? []).join("\n"),
    explicitMods: (wish.explicitMods ?? []).join("\n"),
    desiredMods: (wish.desiredMods ?? []).join("\n"),
    mustHaveAffixes: (wish.mustHaveAffixes ?? []).join("\n"),
    niceAffixes: (wish.niceAffixes ?? []).join("\n"),
    flavourLines: (wish.flavourLines ?? []).join("\n"),
    footerLine: wish.footerLine ?? "",
  };
}

export function applyDraftToWish(wish: Wish, draft: DraftWish): Wish {
  const kind = resolveDraftKind(draft);
  const nextIcon = wish.kind === kind ? wish.icon : getFallbackIcon(kind);

  return {
    ...wish,
    name: getDraftName(draft),
    baseType: getDraftBaseType(draft, kind),
    kind,
    priority: draft.priority,
    quantity: getDraftQuantity(draft),
    sourceUrl: draft.sourceUrl.trim() || undefined,
    dropSource: draft.dropSource.trim() || undefined,
    icon: draft.icon.trim() || nextIcon,
    note: draft.note.trim() || undefined,
    metaLines: splitDraftLines(draft.metaLines),
    requirements: splitDraftLines(draft.requirements),
    properties: parseDraftProperties(draft.properties),
    descriptionLines: splitDraftLines(draft.descriptionLines),
    explicitMods: splitDraftLines(draft.explicitMods),
    desiredMods: splitDraftLines(draft.desiredMods),
    mustHaveAffixes: splitDraftLines(draft.mustHaveAffixes),
    niceAffixes: splitDraftLines(draft.niceAffixes),
    flavourLines: splitDraftLines(draft.flavourLines),
    footerLine: draft.footerLine.trim() || undefined,
  };
}

export function createWishFromDraft(
  draft: DraftWish,
  ownerId: UserId,
  buildId: string,
  addedOrder: number,
): Wish {
  const kind = resolveDraftKind(draft);

  return {
    id: `wish-${Date.now()}`,
    ownerId,
    buildId,
    name: getDraftName(draft),
    baseType: getDraftBaseType(draft, kind),
    kind,
    priority: draft.priority,
    addedOrder,
    quantity: getDraftQuantity(draft),
    sourceUrl: draft.sourceUrl.trim() || undefined,
    dropSource: draft.dropSource.trim() || undefined,
    icon: draft.icon.trim() || getFallbackIcon(kind),
    note: draft.note.trim() || undefined,
    metaLines: splitDraftLines(draft.metaLines),
    requirements: splitDraftLines(draft.requirements),
    properties: parseDraftProperties(draft.properties),
    descriptionLines: splitDraftLines(draft.descriptionLines),
    explicitMods: splitDraftLines(draft.explicitMods),
    desiredMods: splitDraftLines(draft.desiredMods),
    mustHaveAffixes: splitDraftLines(draft.mustHaveAffixes),
    niceAffixes: splitDraftLines(draft.niceAffixes),
    flavourLines: splitDraftLines(draft.flavourLines),
    footerLine: draft.footerLine.trim() || undefined,
  };
}
