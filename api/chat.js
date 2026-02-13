import {
  buildSystemPrompt,
  callGrok,
  classifyContent,
  enforceDailyQuotaOrThrow,
  getSupabaseServiceRole,
  json,
  looksLikeRealtimeRequest,
  readJsonBody,
  refusalMessageForCategory,
  requireUser,
  sanitizeConfig,
} from "./_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { sb, user } = auth;

    const body = await readJsonBody(req);
    if (body === null) return json(res, 400, { error: "JSON invalide" });
    const { threadId, conversationId, userMessage, attachment } = body || {};
    if (!userMessage || typeof userMessage !== "string") {
      return json(res, 400, { error: "userMessage requis (string)" });
    }

    const { data: userSettingsRow } = await sb
      .from("user_settings")
      .select("mature_language_enabled, sensitive_topics_enabled, is_adult_confirmed")
      .eq("user_id", user.id)
      .maybeSingle();

    const userSettings = {
      matureLanguageEnabled: Boolean(userSettingsRow?.mature_language_enabled),
      sensitiveTopicsEnabled: Boolean(userSettingsRow?.sensitive_topics_enabled),
      isAdultConfirmed: Boolean(userSettingsRow?.is_adult_confirmed),
    };

    if ((userSettings.matureLanguageEnabled || userSettings.sensitiveTopicsEnabled) && !userSettings.isAdultConfirmed) {
      userSettings.matureLanguageEnabled = false;
      userSettings.sensitiveTopicsEnabled = false;
    }

    const classification = classifyContent(userMessage);
    if (classification.blocked) {
      return json(res, 200, {
        threadId: (conversationId && String(conversationId)) || (threadId && String(threadId)) || "default",
        userId: user.id,
        assistantMessage: refusalMessageForCategory(classification.category),
      });
    }

    if (!userSettings.sensitiveTopicsEnabled && (classification.category === "self_harm" || classification.category === "hate_violence")) {
      return json(res, 200, {
        threadId: (conversationId && String(conversationId)) || (threadId && String(threadId)) || "default",
        userId: user.id,
        assistantMessage: refusalMessageForCategory(classification.category),
      });
    }

    const id = (conversationId && String(conversationId)) || (threadId && String(threadId)) || "default";

    const { error: convoErr } = await sb
      .from("conversations")
      .upsert({ id, user_id: user.id }, { onConflict: "id" });

    if (convoErr) return json(res, 500, { error: convoErr.message });

    const { data: cfgRow, error: cfgErr } = await sb
      .from("configs")
      .select("contact_name, persona, gender, context, sources_enabled")
      .eq("conversation_id", id)
      .maybeSingle();

    if (cfgErr) return json(res, 500, { error: cfgErr.message });

    const cfg = cfgRow
      ? {
          contactName: cfgRow.contact_name,
          persona: cfgRow.persona,
          gender: cfgRow.gender,
          context: cfgRow.context,
          sourcesEnabled: Boolean(cfgRow.sources_enabled),
        }
      : sanitizeConfig(null);

    const { data: historyRows, error: histErr } = await sb
      .from("messages")
      .select("role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(40);

    if (histErr) return json(res, 500, { error: histErr.message });

    const history = Array.isArray(historyRows) ? historyRows.slice(-20) : [];

    const system = { role: "system", content: buildSystemPrompt(cfg) };
    const messages = [system, ...history, { role: "user", content: userMessage }];

    const { data: insertedUserMsg, error: insertUserErr } = await sb
      .from("messages")
      .insert({
        conversation_id: id,
        user_id: user.id,
        role: "user",
        content: userMessage,
      })
      .select("id")
      .maybeSingle();

    if (insertUserErr) return json(res, 500, { error: insertUserErr.message });

    if (attachment && typeof attachment === "object" && insertedUserMsg?.id) {
      const type = typeof attachment.type === "string" ? attachment.type : "image";
      const storagePath = typeof attachment.storagePath === "string" ? attachment.storagePath : "";
      const storageBucket = typeof attachment.storageBucket === "string" ? attachment.storageBucket : "attachments";
      const mimeType = typeof attachment.mimeType === "string" ? attachment.mimeType : null;
      const sizeBytes = Number.isFinite(Number(attachment.sizeBytes)) ? Number(attachment.sizeBytes) : null;
      const width = Number.isFinite(Number(attachment.width)) ? Number(attachment.width) : null;
      const height = Number.isFinite(Number(attachment.height)) ? Number(attachment.height) : null;

      if (storagePath) {
        const { error: attErr } = await sb.from("attachments").insert({
          user_id: user.id,
          conversation_id: id,
          message_id: insertedUserMsg.id,
          type,
          storage_bucket: storageBucket,
          storage_path: storagePath,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          width,
          height,
        });

        if (attErr) return json(res, 500, { error: attErr.message });
      }
    }

    let assistantText = "";

    if (looksLikeRealtimeRequest(userMessage) && !cfg.sourcesEnabled) {
      assistantText =
        "Je peux t'aider, mais je n'ai pas accès à des sources en temps réel dans ce thread. " +
        "Donne-moi une période précise (date/année, pays/ville) ou l'info que tu as déjà, et je te réponds de façon fiable (cadre général + conseils).";
    } else if (looksLikeRealtimeRequest(userMessage) && cfg.sourcesEnabled) {
      assistantText =
        "Les “Sources” sont activées, mais aucun provider n’est configuré pour l’instant. " +
        "Je peux te répondre de façon prudente (sans faits datés). Si tu me donnes une période précise, je peux aussi aider avec des repères généraux.";
    } else {
      try {
        const adminSb = getSupabaseServiceRole();
        await enforceDailyQuotaOrThrow(adminSb, user.id, { dailyLimit: 20 });
      } catch (e) {
        if (e?.code === "PAYWALL") {
          return json(res, 402, {
            error: "Quota gratuit atteint (20 messages/jour).",
            code: "PAYWALL",
            dailyLimit: e.dailyLimit,
            used: e.used,
            remaining: e.remaining,
          });
        }
        throw e;
      }
      assistantText = await callGrok(messages);
    }

    const { error: insertBotErr } = await sb.from("messages").insert({
      conversation_id: id,
      user_id: user.id,
      role: "assistant",
      content: assistantText,
    });

    if (insertBotErr) return json(res, 500, { error: insertBotErr.message });

    return json(res, 200, { threadId: id, userId: user.id, assistantMessage: assistantText });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
