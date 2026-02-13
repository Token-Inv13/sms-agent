import { ensureProfileRow, getStripeClient, getSupabaseServiceRole, json, requireUser, requireEnv } from "../_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { user } = auth;

    const appUrl = String(process.env.APP_URL || "").trim();
    if (!appUrl) return json(res, 500, { error: "APP_URL manquant" });

    const stripe = getStripeClient();
    const adminSb = getSupabaseServiceRole();

    const profile = await ensureProfileRow(adminSb, user.id);
    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return json(res, 400, { error: "Aucun client Stripe associé. Démarre un abonnement d'abord." });
    }

    // Ensures the Billing Portal is enabled in Stripe dashboard.
    requireEnv("STRIPE_SECRET_KEY");

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    });

    return json(res, 200, { url: session.url });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
