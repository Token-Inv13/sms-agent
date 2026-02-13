import { json, requireUser } from "./_lib.js";

export default async function handler(req, res) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { sb, user } = auth;

    if (req.method !== "GET") return json(res, 405, { error: "Méthode non autorisée" });

    const conversationId = (req.query?.conversationId && String(req.query.conversationId)) || "";
    const beforeIdRaw = (req.query?.beforeId && String(req.query.beforeId)) || "";
    const beforeId = beforeIdRaw ? Number(beforeIdRaw) : null;
    const limitRaw = (req.query?.limit && String(req.query.limit)) || "";
    const limit = Math.max(1, Math.min(50, Number(limitRaw) || 50));
    if (!conversationId) return json(res, 400, { error: "conversationId requis" });

    const { data: convo, error: convoErr } = await sb
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (convoErr) return json(res, 500, { error: convoErr.message });
    if (!convo) return json(res, 404, { error: "Conversation introuvable" });

    let q = sb
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    if (beforeId && Number.isFinite(beforeId)) {
      q = q.lt("id", beforeId);
    }

    // Fetch newest first, then reverse for UI stability
    const { data, error } = await q.order("id", { ascending: false }).limit(limit);

    if (error) return json(res, 500, { error: error.message });

    const rows = Array.isArray(data) ? data : [];
    const messages = rows.slice().reverse();

    const messageIds = messages.map((m) => m.id).filter((x) => Number.isFinite(Number(x)));
    let attachmentsByMessageId = new Map();
    if (messageIds.length) {
      const { data: attRows, error: attErr } = await sb
        .from("attachments")
        .select("id, message_id, type, storage_bucket, storage_path, mime_type, size_bytes, width, height, created_at")
        .in("message_id", messageIds)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (attErr) return json(res, 500, { error: attErr.message });

      const list = Array.isArray(attRows) ? attRows : [];
      for (const a of list) {
        const mid = a.message_id;
        if (!attachmentsByMessageId.has(mid)) attachmentsByMessageId.set(mid, []);
        attachmentsByMessageId.get(mid).push({
          id: a.id,
          type: a.type,
          storageBucket: a.storage_bucket,
          storagePath: a.storage_path,
          mimeType: a.mime_type,
          sizeBytes: a.size_bytes,
          width: a.width,
          height: a.height,
          createdAt: a.created_at,
        });
      }
    }

    const messagesWithAttachments = messages.map((m) => ({
      ...m,
      attachments: attachmentsByMessageId.get(m.id) || [],
    }));

    const nextBeforeId = messagesWithAttachments.length ? messagesWithAttachments[0].id : null;
    return json(res, 200, { conversationId, messages: messagesWithAttachments, nextBeforeId });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
