#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "node:crypto";

const HELP = `
BROSF wishlist CLI

Usage:
  npm run brossf -- invite create --account "Сашенька" --initials "СА" [--token <token>] [--expires-at 2026-07-01T00:00:00Z] [--dry-run]
  npm run brossf -- wish add --owner "Сашенька" --build "BIG MONKE" --name "Forgotten Warden" --kind unique [--poe2db URL] [--comment TEXT] [--priority high] [--quantity 1] [--dry-run]
  npm run brossf -- wish add-rare --owner "Сашенька" --build "BIG MONKE" --name "Dex/Spirit chest" --affix "+Spirit" --affix "+Maximum Life" [--comment TEXT] [--dry-run]
  npm run brossf -- claim add --wish <wish-id> --owner "Пашенька" [--dry-run]
  npm run brossf -- claim remove --wish <wish-id> --owner "Пашенька" [--dry-run]
  npm run brossf -- export [--owner "Сашенька"]

Environment:
  BROSSF_SUPABASE_URL or VITE_SUPABASE_URL
  BROSSF_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY
  BROSSF_ACCOUNT and BROSSF_PASSWORD for user-mode commands
  BROSSF_SUPABASE_SECRET_KEY for invite create
`.trim();

const KIND_VALUES = new Set(["unique", "currency", "gem", "support", "tablet", "rare"]);
const PRIORITY_VALUES = new Set(["low", "normal", "high", "urgent"]);

function readArgs(argv) {
  const flags = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (!part.startsWith("--")) {
      positionals.push(part);
      continue;
    }

    const key = part.slice(2);
    if (key === "dry-run" || key === "help") {
      flags[key] = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;

    if (flags[key] === undefined) {
      flags[key] = value;
    } else if (Array.isArray(flags[key])) {
      flags[key].push(value);
    } else {
      flags[key] = [flags[key], value];
    }
  }

  return { positionals, flags };
}

function env(name, fallbackName) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : "");
}

function requireValue(value, label) {
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function accountNameToInternalEmail(accountName) {
  const domain = env("BROSSF_INTERNAL_EMAIL_DOMAIN", "VITE_BROSSF_INTERNAL_EMAIL_DOMAIN") ||
    "brossf.local.invalid";
  const normalized = accountName.trim().toLowerCase();
  const localPart = Buffer.from(normalized, "utf8").toString("hex");
  if (!localPart) throw new Error("Account name cannot be converted to an internal email.");
  return `u-${localPart}@${domain}`;
}

function publicClient() {
  return createClient(
    requireValue(env("BROSSF_SUPABASE_URL", "VITE_SUPABASE_URL"), "BROSSF_SUPABASE_URL"),
    requireValue(
      env("BROSSF_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"),
      "BROSSF_SUPABASE_PUBLISHABLE_KEY",
    ),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function adminClient() {
  return createClient(
    requireValue(env("BROSSF_SUPABASE_URL", "VITE_SUPABASE_URL"), "BROSSF_SUPABASE_URL"),
    requireValue(process.env.BROSSF_SUPABASE_SECRET_KEY, "BROSSF_SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function signedInClient(owner) {
  const accountName = owner || process.env.BROSSF_ACCOUNT;
  const password = process.env.BROSSF_PASSWORD;
  const client = publicClient();
  const { error } = await client.auth.signInWithPassword({
    email: accountNameToInternalEmail(requireValue(accountName, "owner/BROSSF_ACCOUNT")),
    password: requireValue(password, "BROSSF_PASSWORD"),
  });
  if (error) throw error;
  return client;
}

function splitLines(value) {
  if (!value) return [];
  return String(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function findProfileAndBuild(client, owner, buildName) {
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("account_name", owner)
    .single();
  if (profileError) throw profileError;

  let query = client.from("builds").select("*").eq("profile_id", profile.id);
  query = buildName ? query.eq("build_name", buildName) : query.eq("id", profile.active_build_id);
  const { data: build, error: buildError } = await query.single();
  if (buildError) throw buildError;

  return { profile, build };
}

function dryRun(flags, payload) {
  if (!flags["dry-run"]) return false;
  console.log(JSON.stringify({ dryRun: true, ...payload }, null, 2));
  return true;
}

async function createInvite(flags) {
  const accountName = requireValue(flags.account, "--account");
  const initials = requireValue(flags.initials, "--initials");
  const token = flags.token || randomBytes(24).toString("base64url");
  const payload = {
    account_name: accountName,
    initials,
    token_hash: hashToken(token),
    expires_at: flags["expires-at"] || null,
  };

  if (dryRun(flags, { command: "invite create", accountName, initials })) return;

  const { error } = await adminClient().from("invites").insert(payload);
  if (error) throw error;
  console.log(JSON.stringify({ ok: true, accountName, inviteToken: token }, null, 2));
}

async function addWish(flags, rare = false) {
  const owner = requireValue(flags.owner || process.env.BROSSF_ACCOUNT, "--owner");
  const name = requireValue(flags.name, "--name");
  const kind = rare ? "rare" : (flags.kind || "unique");
  if (!KIND_VALUES.has(kind)) throw new Error(`Unsupported kind: ${kind}`);
  const priority = flags.priority || "normal";
  if (!PRIORITY_VALUES.has(priority)) throw new Error(`Unsupported priority: ${priority}`);
  const affixes = flags.affix ? (Array.isArray(flags.affix) ? flags.affix : [flags.affix]) : [];

  if (dryRun(flags, { command: rare ? "wish add-rare" : "wish add", owner, name, kind })) {
    return;
  }

  const client = await signedInClient(owner);
  const { profile, build } = await findProfileAndBuild(client, owner, flags.build);
  const { count } = await client
    .from("wishes")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", profile.id);

  const { data, error } = await client
    .from("wishes")
    .insert({
      owner_id: profile.id,
      build_id: build.id,
      name,
      base_type: rare ? "Rare Template" : (flags.base || "Catalog Item"),
      kind,
      priority,
      added_order: (count ?? 0) + 1,
      quantity: flags.quantity ? Number(flags.quantity) : null,
      source_url: flags.poe2db || flags.source || null,
      note: flags.comment || null,
      desired_mods: splitLines(flags.mods),
      must_have_affixes: rare ? affixes : splitLines(flags["must-have"]),
      nice_affixes: splitLines(flags["nice-affixes"]),
    })
    .select("id")
    .single();
  if (error) throw error;
  console.log(JSON.stringify({ ok: true, wishId: data.id }, null, 2));
}

async function updateClaim(flags, claimed) {
  const owner = requireValue(flags.owner || process.env.BROSSF_ACCOUNT, "--owner");
  const wishId = requireValue(flags.wish, "--wish");

  if (dryRun(flags, { command: claimed ? "claim add" : "claim remove", owner, wishId })) {
    return;
  }

  const client = await signedInClient(owner);
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id")
    .eq("account_name", owner)
    .single();
  if (profileError) throw profileError;

  const result = claimed
    ? await client.from("wish_claims").insert({ wish_id: wishId, claimer_id: profile.id })
    : await client
        .from("wish_claims")
        .delete()
        .eq("wish_id", wishId)
        .eq("claimer_id", profile.id);
  if (result.error) throw result.error;
  console.log(JSON.stringify({ ok: true }, null, 2));
}

async function exportBoard(flags) {
  const owner = flags.owner || process.env.BROSSF_ACCOUNT;
  if (dryRun(flags, { command: "export", owner: owner || null })) return;

  const client = await signedInClient(owner);
  const [profiles, builds, wishes, claims] = await Promise.all([
    client.from("profiles").select("*").order("account_name"),
    client.from("builds").select("*").order("created_at"),
    client.from("wishes").select("*").order("added_order"),
    client.from("wish_claims").select("*"),
  ]);
  for (const result of [profiles, builds, wishes, claims]) {
    if (result.error) throw result.error;
  }

  console.log(JSON.stringify({
    profiles: profiles.data,
    builds: builds.data,
    wishes: wishes.data,
    claims: claims.data,
  }, null, 2));
}

async function main() {
  const { positionals, flags } = readArgs(process.argv.slice(2));
  const [area, action] = positionals;
  if (flags.help || !area) {
    console.log(HELP);
    return;
  }

  if (area === "invite" && action === "create") return createInvite(flags);
  if (area === "wish" && action === "add") return addWish(flags, false);
  if (area === "wish" && action === "add-rare") return addWish(flags, true);
  if (area === "claim" && action === "add") return updateClaim(flags, true);
  if (area === "claim" && action === "remove") return updateClaim(flags, false);
  if (area === "export") return exportBoard(flags);

  throw new Error(`Unknown command: ${positionals.join(" ")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
