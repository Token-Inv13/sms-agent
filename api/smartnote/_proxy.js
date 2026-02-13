import { getSupabaseServiceRole, json, requireEnv } from "../_lib.js";

export async function getSmartNoteAccessTokenOrThrow(userId) {
  const adminSb = getSupabaseServiceRole();
  const { data, error } = await adminSb
    .from("smartnote_integrations")
    .select("access_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.access_token) {
    const err = new Error("Smart Note non connecté");
    err.code = "SMARTNOTE_NOT_CONNECTED";
    throw err;
  }
  return data.access_token;
}

export async function smartNoteFetch(userId, path, payload) {
  const base = String(requireEnv("SMARTNOTE_BASE_URL") || "").trim().replace(/\/+$/, "");
  const token = await getSmartNoteAccessTokenOrThrow(userId);

  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload || {}),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data?.error || `Erreur Smart Note (${resp.status})`);
    err.httpStatus = resp.status;
    throw err;
  }
  return data;
}
