import { json, requireEnv } from "./_lib.js";

export default async function handler(req, res) {
  try {
    json(res, 200, {
      supabaseUrl: requireEnv("SUPABASE_URL"),
      supabaseAnonKey: requireEnv("SUPABASE_ANON_KEY"),
    });
  } catch (e) {
    json(res, 500, { error: String(e?.message || e) });
  }
}
