import { json, readJsonBody, requireEnv, requireUser } from "./_lib.js";

async function callXaiImageGeneration(prompt) {
  const key = requireEnv("XAI_API_KEY");
  let baseUrl = process.env.XAI_BASE_URL || "https://api.x.ai";
  baseUrl = baseUrl.replace(/\/+$/, "");
  baseUrl = baseUrl.replace(/\/v1$/, "");
  const model = process.env.XAI_IMAGE_MODEL || "grok-imagine-image";

  const resp = await fetch(`${baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, model, image_format: "url" }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data?.error?.message || data?.error || "Image generation failed";
    if (resp.status === 404) {
      throw new Error(
        "Génération d'image indisponible (404). Vérifie que ton compte xAI a accès au modèle image et que XAI_IMAGE_MODEL est correct (ex: grok-imagine-image)."
      );
    }
    throw new Error(msg);
  }

  const url = data?.data?.[0]?.url || data?.url || null;
  const b64 = data?.data?.[0]?.b64_json || null;
  return { url, b64, model };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { sb, user } = auth;

    const body = await readJsonBody(req);
    if (body === null) return json(res, 400, { error: "JSON invalide" });

    const conversationId = (body?.conversationId && String(body.conversationId)) || "";
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!conversationId) return json(res, 400, { error: "conversationId requis" });
    if (!prompt) return json(res, 400, { error: "prompt requis" });

    const { data: convo, error: convoErr } = await sb
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (convoErr) return json(res, 500, { error: convoErr.message });
    if (!convo) return json(res, 404, { error: "Conversation introuvable" });

    const { data: userMsg, error: userMsgErr } = await sb
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "user",
        content: prompt,
      })
      .select("id")
      .maybeSingle();

    if (userMsgErr) return json(res, 500, { error: userMsgErr.message });

    const { url, b64 } = await callXaiImageGeneration(prompt);
    if (!url && !b64) return json(res, 500, { error: "Aucune image retournée" });

    let bytes;
    let mimeType = "image/png";

    if (b64) {
      bytes = Buffer.from(b64, "base64");
    } else {
      const imgResp = await fetch(url);
      if (!imgResp.ok) return json(res, 500, { error: "Téléchargement image échoué" });
      mimeType = imgResp.headers.get("content-type") || mimeType;
      const ab = await imgResp.arrayBuffer();
      bytes = Buffer.from(ab);
    }

    const ext = mimeType.includes("jpeg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
    const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now());
    const storageBucket = "attachments";
    const storagePath = `${user.id}/${conversationId}/${uuid}.${ext}`;

    const { error: uploadErr } = await sb.storage.from(storageBucket).upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: false,
    });

    if (uploadErr) return json(res, 500, { error: uploadErr.message });

    const assistantText = "Voici une image générée.";

    const { data: botMsg, error: botMsgErr } = await sb
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: assistantText,
      })
      .select("id")
      .maybeSingle();

    if (botMsgErr) return json(res, 500, { error: botMsgErr.message });

    const { data: attRow, error: attErr } = await sb
      .from("attachments")
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        message_id: botMsg?.id || null,
        type: "image",
        storage_bucket: storageBucket,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: bytes.length,
      })
      .select("id")
      .maybeSingle();

    if (attErr) return json(res, 500, { error: attErr.message });

    return json(res, 200, {
      conversationId,
      userMessageId: userMsg?.id || null,
      assistantMessage: assistantText,
      assistantMessageId: botMsg?.id || null,
      attachment: {
        id: attRow?.id || null,
        type: "image",
        storageBucket,
        storagePath,
        mimeType,
        sizeBytes: bytes.length,
      },
    });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
