import { json, readJsonBody, requireUser } from "./_lib.js";

export default async function handler(req, res) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { sb, user } = auth;

    if (req.method === "GET") {
      const { data, error } = await sb
        .from("user_settings")
        .select("mature_language_enabled, sensitive_topics_enabled, is_adult_confirmed, adult_confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) return json(res, 500, { error: error.message });

      const settings = data
        ? {
            matureLanguageEnabled: Boolean(data.mature_language_enabled),
            sensitiveTopicsEnabled: Boolean(data.sensitive_topics_enabled),
            isAdultConfirmed: Boolean(data.is_adult_confirmed),
            adultConfirmedAt: data.adult_confirmed_at || null,
          }
        : {
            matureLanguageEnabled: false,
            sensitiveTopicsEnabled: false,
            isAdultConfirmed: false,
            adultConfirmedAt: null,
          };

      return json(res, 200, { userId: user.id, settings });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (body === null) return json(res, 400, { error: "JSON invalide" });

      const matureLanguageEnabled = Boolean(body?.matureLanguageEnabled);
      const sensitiveTopicsEnabled = Boolean(body?.sensitiveTopicsEnabled);
      const isAdultConfirmed = Boolean(body?.isAdultConfirmed);

      // age gate: must confirm adulthood before enabling mature/sensitive toggles
      const wantsAdultContent = matureLanguageEnabled || sensitiveTopicsEnabled;
      if (wantsAdultContent && !isAdultConfirmed) {
        return json(res, 400, { error: "Confirmation 18+ requise" });
      }

      const { data, error } = await sb
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            mature_language_enabled: matureLanguageEnabled,
            sensitive_topics_enabled: sensitiveTopicsEnabled,
            is_adult_confirmed: isAdultConfirmed,
            adult_confirmed_at: isAdultConfirmed ? new Date().toISOString() : null,
          },
          { onConflict: "user_id" }
        )
        .select("mature_language_enabled, sensitive_topics_enabled, is_adult_confirmed, adult_confirmed_at")
        .maybeSingle();

      if (error) return json(res, 500, { error: error.message });

      return json(res, 200, {
        userId: user.id,
        settings: {
          matureLanguageEnabled: Boolean(data?.mature_language_enabled),
          sensitiveTopicsEnabled: Boolean(data?.sensitive_topics_enabled),
          isAdultConfirmed: Boolean(data?.is_adult_confirmed),
          adultConfirmedAt: data?.adult_confirmed_at || null,
        },
      });
    }

    return json(res, 405, { error: "Méthode non autorisée" });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
