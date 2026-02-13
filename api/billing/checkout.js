import { ensureProfileRow, getStripeClient, getSupabaseServiceRole, json, readJsonBody, requireUser } from "../_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { user } = auth;
    const body = await readJsonBody(req);
    if (body === null) return json(res, 400, { error: "JSON invalide" });

    const appUrl = String(process.env.APP_URL || "").trim();
    if (!appUrl) return json(res, 500, { error: "APP_URL manquant" });

    const stripe = getStripeClient();
    const adminSb = getSupabaseServiceRole();

    const profile = await ensureProfileRow(adminSb, user.id);

    let customerId = profile?.stripe_customer_id || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await adminSb.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", user.id);
    }

    const priceId = process.env.STRIPE_PRICE_ID_PRO_MONTHLY;
    if (!priceId) return json(res, 500, { error: "STRIPE_PRICE_ID_PRO_MONTHLY manquant" });

    const successUrl = `${appUrl}/settings?billing=success`;
    const cancelUrl = `${appUrl}/settings?billing=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: user.id },
      },
      metadata: { user_id: user.id },
      client_reference_id: user.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return json(res, 200, { url: session.url });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
