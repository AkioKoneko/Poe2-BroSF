const DEFAULT_INTERNAL_EMAIL_DOMAIN = "brossf.local.invalid";

export interface SupabaseEnv {
  url: string;
  publishableKey: string;
  internalEmailDomain: string;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = clean(import.meta.env.VITE_SUPABASE_URL);
  const publishableKey = clean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const internalEmailDomain =
    clean(import.meta.env.VITE_BROSSF_INTERNAL_EMAIL_DOMAIN) ||
    DEFAULT_INTERNAL_EMAIL_DOMAIN;

  const missing = [
    !url ? "VITE_SUPABASE_URL" : null,
    !publishableKey ? "VITE_SUPABASE_PUBLISHABLE_KEY" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing public Supabase env: ${missing.join(", ")}`);
  }

  return {
    url,
    publishableKey,
    internalEmailDomain,
  };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    clean(import.meta.env.VITE_SUPABASE_URL) &&
      clean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  );
}

export function accountNameToInternalEmail(accountName: string): string {
  const domain =
    clean(import.meta.env.VITE_BROSSF_INTERNAL_EMAIL_DOMAIN) ||
    DEFAULT_INTERNAL_EMAIL_DOMAIN;
  const normalized = accountName.trim().toLowerCase();
  const encoded = [...new TextEncoder().encode(normalized)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  if (!encoded) {
    throw new Error("Account name cannot be converted to an internal email.");
  }

  return `u-${encoded}@${domain}`;
}
