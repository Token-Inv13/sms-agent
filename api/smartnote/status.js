import { getSupabaseServiceRole, json, requireUser } from "../_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { user } = auth;
    const adminSb = getSupabaseServiceRole();

    const { data, error } = await adminSb
      .from("smartnote_integrations")
      .select("scopes, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return json(res, 500, { error: error.message });

    return json(res, 200, {
      connected: Boolean(data),
      scopes: data?.scopes || [],
      createdAt: data?.created_at || null,
      updatedAt: data?.updated_at || null,
    });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
