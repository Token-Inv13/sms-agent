import { json, readJsonBody, requireUser, sanitizeConfig } from "./_lib.js";

function normalizePresetInput(input) {
  const title = typeof input?.title === "string" ? input.title.slice(0, 80).trim() : "";
  const subtitle = typeof input?.subtitle === "string" ? input.subtitle.slice(0, 120).trim() : "";
  const cfg = sanitizeConfig(input?.config);

  if (!title) return { error: "title requis" };

  return {
    title,
    subtitle: subtitle || null,
    cfg,
  };
}

export default async function handler(req, res) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { sb, user } = auth;

    if (req.method === "GET") {
      const { data, error } = await sb
        .from("presets")
        .select("id, title, subtitle, contact_name, persona, gender, context, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (error) return json(res, 500, { error: error.message });

      const presets = (data || []).map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        config: {
          contactName: p.contact_name,
          persona: p.persona,
          gender: p.gender,
          context: p.context,
        },
      }));

      return json(res, 200, { presets });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (body === null) return json(res, 400, { error: "JSON invalide" });

      const norm = normalizePresetInput(body);
      if (norm.error) return json(res, 400, { error: norm.error });

      const { data, error } = await sb
        .from("presets")
        .insert({
          user_id: user.id,
          title: norm.title,
          subtitle: norm.subtitle,
          contact_name: norm.cfg.contactName,
          persona: norm.cfg.persona,
          gender: norm.cfg.gender,
          context: norm.cfg.context,
        })
        .select("id, title, subtitle, contact_name, persona, gender, context, created_at, updated_at")
        .single();

      if (error) return json(res, 500, { error: error.message });

      return json(res, 200, {
        preset: {
          id: data.id,
          title: data.title,
          subtitle: data.subtitle,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          config: {
            contactName: data.contact_name,
            persona: data.persona,
            gender: data.gender,
            context: data.context,
          },
        },
      });
    }

    if (req.method === "PATCH") {
      const body = await readJsonBody(req);
      if (body === null) return json(res, 400, { error: "JSON invalide" });

      const id = body?.id && String(body.id);
      if (!id) return json(res, 400, { error: "id requis" });

      const norm = normalizePresetInput(body);
      if (norm.error) return json(res, 400, { error: norm.error });

      const { data, error } = await sb
        .from("presets")
        .update({
          title: norm.title,
          subtitle: norm.subtitle,
          contact_name: norm.cfg.contactName,
          persona: norm.cfg.persona,
          gender: norm.cfg.gender,
          context: norm.cfg.context,
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id, title, subtitle, contact_name, persona, gender, context, created_at, updated_at")
        .maybeSingle();

      if (error) return json(res, 500, { error: error.message });
      if (!data) return json(res, 404, { error: "Preset introuvable" });

      return json(res, 200, {
        preset: {
          id: data.id,
          title: data.title,
          subtitle: data.subtitle,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          config: {
            contactName: data.contact_name,
            persona: data.persona,
            gender: data.gender,
            context: data.context,
          },
        },
      });
    }

    if (req.method === "DELETE") {
      const id = (req.query?.id && String(req.query.id)) || "";
      if (!id) return json(res, 400, { error: "id requis" });

      const { error } = await sb.from("presets").delete().eq("id", id).eq("user_id", user.id);
      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Méthode non autorisée" });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
