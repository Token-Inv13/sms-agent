import { json, readJsonBody, requireUser } from "../_lib.js";
import { smartNoteFetch } from "./_proxy.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { user } = auth;
    const body = await readJsonBody(req);
    if (body === null) return json(res, 400, { error: "JSON invalide" });

    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const remindAt = typeof body?.remindAt === "string" ? body.remindAt.trim() : null;

    if (!text) return json(res, 400, { error: "text requis" });
    if (!remindAt) return json(res, 400, { error: "remindAt requis (ISO)" });

    const data = await smartNoteFetch(user.id, "/integrations/sms-agent/reminder", {
      text,
      remindAt,
      source: body?.source || { app: "sms-agent" },
    });

    return json(res, 200, data);
  } catch (e) {
    if (e?.code === "SMARTNOTE_NOT_CONNECTED") {
      return json(res, 400, { error: "Smart Note non connecté", code: "SMARTNOTE_NOT_CONNECTED" });
    }
    return json(res, 500, { error: String(e?.message || e) });
  }
}
