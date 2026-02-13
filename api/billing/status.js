import { ensureProfileRow, getSupabaseServiceRole, isProEntitled, json, requireUser } from "../_lib.js";

const DAILY_LIMIT_FREE = 20;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { user } = auth;
    const adminSb = getSupabaseServiceRole();

    const profile = await ensureProfileRow(adminSb, user.id);
    const pro = isProEntitled(profile);

    const today = new Date().toISOString().slice(0, 10);
    const { data: usageRow, error: usageErr } = await adminSb
      .from("usage_daily")
      .select("messages_count")
      .eq("user_id", user.id)
      .eq("day", today)
      .maybeSingle();

    if (usageErr) return json(res, 500, { error: usageErr.message });

    const used = Number(usageRow?.messages_count || 0);
    const remaining = pro ? null : Math.max(0, DAILY_LIMIT_FREE - used);

    return json(res, 200, {
      plan: pro ? "pro" : "free",
      subscriptionStatus: profile?.subscription_status || "none",
      trialEndsAt: profile?.trial_ends_at || null,
      daily: {
        limit: pro ? null : DAILY_LIMIT_FREE,
        used,
        remaining,
      },
    });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
