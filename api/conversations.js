import { json, readJsonBody, requireUser } from "./_lib.js";

export default async function handler(req, res) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { sb, user } = auth;

    if (req.method === "GET") {
      const { data, error } = await sb.rpc("get_conversation_summaries");
      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, { conversations: data || [] });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (body === null) return json(res, 400, { error: "JSON invalide" });

      const title = typeof body?.title === "string" ? body.title.slice(0, 80).trim() : "";
      const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : undefined;
      if (!id) return json(res, 500, { error: "UUID indisponible" });

      const { error } = await sb.from("conversations").insert({
        id,
        user_id: user.id,
        title: title || null,
      });

      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, { conversation: { id, title: title || null } });
    }

    if (req.method === "PATCH") {
      const body = await readJsonBody(req);
      if (body === null) return json(res, 400, { error: "JSON invalide" });

      const id = body?.id && String(body.id);
      const title = typeof body?.title === "string" ? body.title.slice(0, 80).trim() : "";
      if (!id) return json(res, 400, { error: "id requis" });

      const { error } = await sb
        .from("conversations")
        .update({ title: title || null })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, { conversation: { id, title: title || null } });
    }

    if (req.method === "DELETE") {
      const id = (req.query?.id && String(req.query.id)) || "";
      if (!id) return json(res, 400, { error: "id requis" });

      const { error } = await sb.from("conversations").delete().eq("id", id).eq("user_id", user.id);
      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Méthode non autorisée" });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
