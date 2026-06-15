import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function toInternalEmail(accountName: string): string {
  const domain = Deno.env.get("BROSSF_INTERNAL_EMAIL_DOMAIN") ||
    "brossf.local.invalid";
  const localPart = accountName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!localPart) throw new Error("Invalid invite account name.");
  return `${localPart}@${domain}`;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Invite service is not configured." }, 500);
  }

  const body = await req.json().catch(() => null) as {
    token?: string;
    password?: string;
  } | null;
  const token = body?.token?.trim() ?? "";
  const password = body?.password ?? "";

  if (!token || password.length < 8) {
    return json({ error: "Invite token and an 8+ character password are required." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const tokenHash = await sha256Hex(token);

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, account_name, initials, status, expires_at")
    .eq("token_hash", tokenHash)
    .eq("status", "open")
    .maybeSingle();

  if (inviteError) return json({ error: inviteError.message }, 500);
  if (!invite) return json({ error: "Invite is invalid or already used." }, 404);
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return json({ error: "Invite has expired." }, 410);
  }

  const email = toInternalEmail(invite.account_name);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      brossf_account_name: invite.account_name,
    },
  });

  if (createError) return json({ error: createError.message }, 409);

  const userId = created.user?.id;
  if (!userId) return json({ error: "Supabase user was not created." }, 500);

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    account_name: invite.account_name,
    initials: invite.initials,
  });
  if (profileError) return json({ error: profileError.message }, 500);

  const { data: build, error: buildError } = await admin
    .from("builds")
    .insert({
      profile_id: userId,
      character_name: "",
      build_name: "New build",
      ascendancy_id: "spirit-walker",
    })
    .select("id")
    .single();
  if (buildError) return json({ error: buildError.message }, 500);

  const [{ error: activeBuildError }, { error: inviteUpdateError }] =
    await Promise.all([
      admin
        .from("profiles")
        .update({ active_build_id: build.id })
        .eq("id", userId),
      admin
        .from("invites")
        .update({
          status: "claimed",
          claimed_by: userId,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", invite.id),
    ]);

  if (activeBuildError) return json({ error: activeBuildError.message }, 500);
  if (inviteUpdateError) return json({ error: inviteUpdateError.message }, 500);

  return json({
    accountName: invite.account_name,
  });
});
