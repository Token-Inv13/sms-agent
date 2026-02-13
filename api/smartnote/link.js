import { getSupabaseServiceRole, json, readJsonBody, requireUser } from "../_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { user } = auth;
    const body = await readJsonBody(req);
    if (body === null) return json(res, 400, { error: "JSON invalide" });

    const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
    const scopes = Array.isArray(body?.scopes) ? body.scopes.map((s) => String(s)).slice(0, 20) : [];

    if (!accessToken) return json(res, 400, { error: "accessToken requis" });

    const adminSb = getSupabaseServiceRole();

    const { error } = await adminSb.from("smartnote_integrations").upsert(
      {
        user_id: user.id,
        access_token: accessToken,
        scopes,
      },
      { onConflict: "user_id" }
    );

    if (error) return json(res, 500, { error: error.message });

    return json(res, 200, { connected: true });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
