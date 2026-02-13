import { buildSystemPrompt, json, readJsonBody, requireUser, sanitizeConfig } from "./_lib.js";

export default async function handler(req, res) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { sb, user } = auth;

    if (req.method === "GET") {
      const threadId = (req.query?.threadId && String(req.query.threadId)) || null;
      const conversationId = (req.query?.conversationId && String(req.query.conversationId)) || null;
      const id = conversationId || threadId || "default";

      const { data, error } = await sb
        .from("configs")
        .select("contact_name, persona, gender, context, sources_enabled")
        .eq("conversation_id", id)
        .maybeSingle();

      if (error) return json(res, 500, { error: error.message });

      const config = data
        ? {
            contactName: data.contact_name,
            persona: data.persona,
            gender: data.gender,
            context: data.context,
            sourcesEnabled: Boolean(data.sources_enabled),
          }
        : sanitizeConfig(null);

      return json(res, 200, { conversationId: id, userId: user.id, config, systemPreview: buildSystemPrompt(config) });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (body === null) return json(res, 400, { error: "JSON invalide" });
      const { threadId, conversationId, config } = body || {};
      const id = (conversationId && String(conversationId)) || (threadId && String(threadId)) || "default";
      const cfg = sanitizeConfig(config);

      const { error: convoErr } = await sb
        .from("conversations")
        .upsert({ id, user_id: user.id }, { onConflict: "id" });

      if (convoErr) return json(res, 500, { error: convoErr.message });

      const { error: upsertErr } = await sb.from("configs").upsert(
        {
          conversation_id: id,
          user_id: user.id,
          contact_name: cfg.contactName,
          persona: cfg.persona,
          gender: cfg.gender,
          context: cfg.context,
          sources_enabled: cfg.sourcesEnabled,
        },
        { onConflict: "conversation_id" }
      );

      if (upsertErr) return json(res, 500, { error: upsertErr.message });
      return json(res, 200, { conversationId: id, userId: user.id, config: cfg });
    }

    return json(res, 405, { error: "Méthode non autorisée" });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
