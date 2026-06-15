import type {
  BuildProfile,
  ClaimState,
  DraftWish,
  Player,
  PropertyLine,
  UserId,
  Wish,
  WishKind,
  WishPriority,
} from "../types";
import { applyDraftToWish, createWishFromDraft } from "../utils/wishlist";
import { accountNameToInternalEmail } from "./supabaseEnv";
import { getSupabaseClient } from "./supabaseClient";

interface ProfileRow {
  id: string;
  account_name: string;
  initials: string;
  active_build_id: string | null;
}

interface BuildRow {
  id: string;
  profile_id: string;
  character_name: string;
  build_name: string;
  ascendancy_id: string;
}

interface WishRow {
  id: string;
  owner_id: string;
  build_id: string;
  name: string;
  base_type: string;
  kind: string;
  priority: string;
  added_order: number;
  quantity: number | null;
  source_url: string | null;
  icon: string | null;
  note: string | null;
  requirements: string[];
  properties: unknown;
  meta_lines: string[];
  description_lines: string[];
  explicit_mods: string[];
  desired_mods: string[];
  must_have_affixes: string[];
  nice_affixes: string[];
  flavour_lines: string[];
  footer_line: string | null;
}

interface ClaimRow {
  wish_id: string;
  claimer_id: string;
}

export interface BoardData {
  activeUserId: UserId;
  players: Player[];
  wishes: Wish[];
  claims: ClaimState;
}

function assertNoError(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`);
}

function asKind(value: string): WishKind {
  if (
    value === "unique" ||
    value === "currency" ||
    value === "gem" ||
    value === "support" ||
    value === "tablet" ||
    value === "rare"
  ) {
    return value;
  }
  return "rare";
}

function asPriority(value: string): WishPriority {
  if (
    value === "low" ||
    value === "normal" ||
    value === "high" ||
    value === "urgent"
  ) {
    return value;
  }
  return "normal";
}

function asProperties(value: unknown): PropertyLine[] {
  return Array.isArray(value) ? (value as PropertyLine[]) : [];
}

function toBuild(row: BuildRow): BuildProfile {
  return {
    id: row.id,
    characterName: row.character_name,
    buildName: row.build_name,
    ascendancyId: row.ascendancy_id as BuildProfile["ascendancyId"],
  };
}

function toWish(row: WishRow): Wish {
  return {
    id: row.id,
    ownerId: row.owner_id,
    buildId: row.build_id,
    name: row.name,
    baseType: row.base_type,
    kind: asKind(row.kind),
    priority: asPriority(row.priority),
    addedOrder: row.added_order,
    quantity: row.quantity ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    icon: row.icon ?? undefined,
    note: row.note ?? undefined,
    requirements: row.requirements,
    properties: asProperties(row.properties),
    metaLines: row.meta_lines,
    descriptionLines: row.description_lines,
    explicitMods: row.explicit_mods,
    desiredMods: row.desired_mods,
    mustHaveAffixes: row.must_have_affixes,
    niceAffixes: row.nice_affixes,
    flavourLines: row.flavour_lines,
    footerLine: row.footer_line ?? undefined,
  };
}

function toPlayers(profiles: ProfileRow[], builds: BuildRow[]): Player[] {
  const buildsByProfile = new Map<string, BuildProfile[]>();
  for (const build of builds) {
    const list = buildsByProfile.get(build.profile_id) ?? [];
    list.push(toBuild(build));
    buildsByProfile.set(build.profile_id, list);
  }

  return profiles.map((profile) => {
    const profileBuilds = buildsByProfile.get(profile.id) ?? [];
    return {
      id: profile.id,
      accountName: profile.account_name,
      initials: profile.initials,
      activeBuildId: profile.active_build_id ?? profileBuilds[0]?.id ?? "",
      builds: profileBuilds,
    };
  });
}

function toClaims(rows: ClaimRow[]): ClaimState {
  return rows.reduce<ClaimState>((claims, row) => {
    claims[row.wish_id] = [...(claims[row.wish_id] ?? []), row.claimer_id];
    return claims;
  }, {});
}

function fromWishForInsert(wish: Wish) {
  return {
    owner_id: wish.ownerId,
    build_id: wish.buildId,
    name: wish.name,
    base_type: wish.baseType,
    kind: wish.kind,
    priority: wish.priority,
    added_order: wish.addedOrder,
    quantity: wish.quantity ?? null,
    source_url: wish.sourceUrl ?? null,
    icon: wish.icon ?? null,
    note: wish.note ?? null,
    requirements: wish.requirements ?? [],
    properties: wish.properties ?? [],
    meta_lines: wish.metaLines ?? [],
    description_lines: wish.descriptionLines ?? [],
    explicit_mods: wish.explicitMods ?? [],
    desired_mods: wish.desiredMods ?? [],
    must_have_affixes: wish.mustHaveAffixes ?? [],
    nice_affixes: wish.niceAffixes ?? [],
    flavour_lines: wish.flavourLines ?? [],
    footer_line: wish.footerLine ?? null,
  };
}

export async function signInWithAccountName(
  accountName: string,
  password: string,
): Promise<BoardData> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: accountNameToInternalEmail(accountName),
    password,
  });
  assertNoError(error, "Sign in failed");
  return loadBoardData();
}

export async function redeemInvite(
  token: string,
  password: string,
): Promise<BoardData> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("redeem-invite", {
    body: { token, password },
  });
  assertNoError(error, "Invite claim failed");

  const accountName = (data as { accountName?: string } | null)?.accountName;
  if (!accountName) throw new Error("Invite claim did not return an account.");

  return signInWithAccountName(accountName, password);
}

export async function signOutOfSupabase(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  assertNoError(error, "Sign out failed");
}

export async function loadBoardData(): Promise<BoardData> {
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  assertNoError(userError, "Load current user failed");

  const userId = userData.user?.id;
  if (!userId) throw new Error("No active Supabase session.");

  const [profilesResult, buildsResult, wishesResult, claimsResult] =
    await Promise.all([
      supabase.from("profiles").select("*").order("account_name"),
      supabase.from("builds").select("*").order("created_at"),
      supabase.from("wishes").select("*").order("added_order", {
        ascending: false,
      }),
      supabase.from("wish_claims").select("*"),
    ]);

  assertNoError(profilesResult.error, "Load profiles failed");
  assertNoError(buildsResult.error, "Load builds failed");
  assertNoError(wishesResult.error, "Load wishes failed");
  assertNoError(claimsResult.error, "Load claims failed");

  const players = toPlayers(
    (profilesResult.data ?? []) as ProfileRow[],
    (buildsResult.data ?? []) as BuildRow[],
  );

  if (!players.some((player) => player.id === userId)) {
    throw new Error("Current Supabase user has no BROSF profile.");
  }

  return {
    activeUserId: userId,
    players,
    wishes: ((wishesResult.data ?? []) as WishRow[]).map(toWish),
    claims: toClaims((claimsResult.data ?? []) as ClaimRow[]),
  };
}

export async function saveRemoteProfile(player: Player): Promise<BoardData> {
  const supabase = getSupabaseClient();
  const buildRows = player.builds.map((build) => ({
    id: build.id,
    profile_id: player.id,
    character_name: build.characterName,
    build_name: build.buildName,
    ascendancy_id: build.ascendancyId,
  }));

  const { error: buildError } = await supabase.from("builds").upsert(buildRows);
  assertNoError(buildError, "Save builds failed");

  const keepIds = player.builds.map((build) => build.id);
  if (keepIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("builds")
      .delete()
      .eq("profile_id", player.id)
      .not("id", "in", `(${keepIds.join(",")})`);
    assertNoError(deleteError, "Delete removed builds failed");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      initials: player.initials,
      active_build_id: player.activeBuildId || null,
    })
    .eq("id", player.id);
  assertNoError(profileError, "Save profile failed");

  return loadBoardData();
}

export async function addRemoteWish(
  draft: DraftWish,
  ownerId: UserId,
  buildId: string,
  addedOrder: number,
): Promise<BoardData> {
  const wish = createWishFromDraft(draft, ownerId, buildId, addedOrder);
  const { error } = await getSupabaseClient()
    .from("wishes")
    .insert(fromWishForInsert(wish));
  assertNoError(error, "Add wish failed");
  return loadBoardData();
}

export async function updateRemoteWish(
  existing: Wish,
  draft: DraftWish,
): Promise<BoardData> {
  const wish = applyDraftToWish(existing, draft);
  const { error } = await getSupabaseClient()
    .from("wishes")
    .update(fromWishForInsert(wish))
    .eq("id", wish.id);
  assertNoError(error, "Update wish failed");
  return loadBoardData();
}

export async function deleteRemoteWish(wishId: string): Promise<BoardData> {
  const { error } = await getSupabaseClient()
    .from("wishes")
    .delete()
    .eq("id", wishId);
  assertNoError(error, "Delete wish failed");
  return loadBoardData();
}

export async function setRemoteClaim(
  wishId: string,
  claimerId: UserId,
  claimed: boolean,
): Promise<BoardData> {
  const supabase = getSupabaseClient();
  const result = claimed
    ? await supabase.from("wish_claims").insert({
        wish_id: wishId,
        claimer_id: claimerId,
      })
    : await supabase
        .from("wish_claims")
        .delete()
        .eq("wish_id", wishId)
        .eq("claimer_id", claimerId);

  assertNoError(result.error, claimed ? "Add claim failed" : "Remove claim failed");
  return loadBoardData();
}
