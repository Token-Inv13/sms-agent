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

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const dueAt = typeof body?.dueAt === "string" ? body.dueAt.trim() : null;
    const priority = body?.priority ? String(body.priority) : undefined;

    if (!title) return json(res, 400, { error: "title requis" });

    const data = await smartNoteFetch(user.id, "/integrations/sms-agent/task", {
      title,
      dueAt: dueAt || undefined,
      priority,
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
