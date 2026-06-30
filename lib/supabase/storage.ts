import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const AVATAR_BUCKET = "agenda-pro";

const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

function getSupabaseClient(): SupabaseClient {
  if (!globalForSupabase.supabase) {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error(
        "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para upload de fotos."
      );
    }
    globalForSupabase.supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return globalForSupabase.supabase;
}

function extensionFor(mimeType: string): string {
  return mimeType === "image/png" ? "png" : "jpg";
}

/**
 * Uploads (or replaces) a user's avatar in the Supabase `avatars` bucket and
 * returns its public URL. Server-only — uses the service role key (Constitution
 * V/VI). Throws on failure so the Route Handler can return a typed 500.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = getSupabaseClient();
  const path = `${userId}.${extensionFor(file.type)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, arrayBuffer, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Falha ao enviar a foto: ${error.message}`);
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
