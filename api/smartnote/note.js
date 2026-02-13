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

    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";

    if (!content) return json(res, 400, { error: "content requis" });

    const data = await smartNoteFetch(user.id, "/integrations/sms-agent/note", {
      title: title || undefined,
      content,
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
