import { getSupabaseServiceRole, json, requireUser } from "../_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { user } = auth;
    const adminSb = getSupabaseServiceRole();

    const { error } = await adminSb.from("smartnote_integrations").delete().eq("user_id", user.id);
    if (error) return json(res, 500, { error: error.message });

    return json(res, 200, { connected: false });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
