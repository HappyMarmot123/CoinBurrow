import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

let client: SupabaseClient | null | undefined;

export function readAuthProviderEnabled(
  settings: unknown,
  provider: string,
): boolean | null {
  if (!settings || typeof settings !== "object") return null;
  const external = Reflect.get(settings, "external");
  if (!external || typeof external !== "object") return null;
  const enabled = Reflect.get(external, provider);
  return typeof enabled === "boolean" ? enabled : null;
}

export function hasSupabaseConfiguration(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!supabaseUrl || !supabaseKey) {
    client = null;
    return client;
  }

  client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return client;
}

export async function getSupabaseAuthProviderStatus(
  provider: string,
): Promise<boolean | null> {
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/settings`, {
      headers: { apikey: supabaseKey },
    });
    if (!response.ok) return null;
    return readAuthProviderEnabled(await response.json(), provider);
  } catch {
    return null;
  }
}
