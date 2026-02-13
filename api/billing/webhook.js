import { getStripeClient, getSupabaseServiceRole, json, readRawBody, requireEnv } from "../_lib.js";

function planFromStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active" || s === "trialing") return "pro";
  return "free";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

    const stripe = getStripeClient();
    const sig = req.headers["stripe-signature"];
    if (!sig) return json(res, 400, { error: "stripe-signature manquant" });

    const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
    const raw = await readRawBody(req);

    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
    } catch (e) {
      return json(res, 400, { error: `Signature invalide: ${String(e?.message || e)}` });
    }

    const adminSb = getSupabaseServiceRole();

    const type = event.type;

    const upsertFromSubscription = async (sub) => {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      const status = sub.status;
      const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

      const userId = sub.metadata?.user_id || null;
      if (userId) {
        await adminSb.from("profiles").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId || null,
            plan: planFromStatus(status),
            subscription_status: status || "none",
            trial_ends_at: trialEndsAt,
            subscription_current_period_end: periodEnd,
          },
          { onConflict: "user_id" }
        );
        return;
      }

      if (customerId) {
        await adminSb
          .from("profiles")
          .update({
            plan: planFromStatus(status),
            subscription_status: status || "none",
            trial_ends_at: trialEndsAt,
            subscription_current_period_end: periodEnd,
          })
          .eq("stripe_customer_id", customerId);
      }
    };

    if (type.startsWith("customer.subscription.")) {
      await upsertFromSubscription(event.data.object);
    }

    if (type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session?.metadata?.user_id || session?.client_reference_id || null;
      const customerId = session?.customer || null;
      if (userId) {
        await adminSb.from("profiles").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId || null,
          },
          { onConflict: "user_id" }
        );
      }
    }

    return json(res, 200, { received: true });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
