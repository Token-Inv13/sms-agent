import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

const plusBtn = document.getElementById("plusBtn");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");
const docInput = document.getElementById("docInput");
const attachPreview = document.getElementById("attachPreview");
const attachThumb = document.getElementById("attachThumb");
const attachLabel = document.getElementById("attachLabel");
const attachRemove = document.getElementById("attachRemove");
const sendBtn = document.getElementById("sendBtn");

const screenAuth = document.getElementById("screenAuth");
const screenMessages = document.getElementById("screenMessages");
const screenGlobalSettings = document.getElementById("screenGlobalSettings");
const screenDirectory = document.getElementById("screenDirectory");
const screenChat = document.getElementById("screenChat");

const authBox = document.getElementById("auth");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const authMsg = document.getElementById("authMsg");

const convosBox = document.getElementById("convos");
const convosList = document.getElementById("convosList");
const newConvoBtn = document.getElementById("newConvoBtn");
const globalSettingsBtn = document.getElementById("globalSettingsBtn");
const convosSearch = document.getElementById("convosSearch");
const directoryBackBtn = document.getElementById("directoryBackBtn");

const globalSettingsBackBtn = document.getElementById("globalSettingsBackBtn");
const themeModeEl = document.getElementById("themeMode");
const notificationsEnabledEl = document.getElementById("notificationsEnabled");
const billingPlanEl = document.getElementById("billingPlan");
const billingUsageEl = document.getElementById("billingUsage");
const billingUpgradeBtn = document.getElementById("billingUpgradeBtn");
const billingManageBtn = document.getElementById("billingManageBtn");
const billingRefreshBtn = document.getElementById("billingRefreshBtn");
const billingMsg = document.getElementById("billingMsg");

const smartNoteStatusEl = document.getElementById("smartNoteStatus");
const smartNoteTokenEl = document.getElementById("smartNoteToken");
const smartNoteConnectBtn = document.getElementById("smartNoteConnectBtn");
const smartNoteDisconnectBtn = document.getElementById("smartNoteDisconnectBtn");
const smartNoteRefreshBtn = document.getElementById("smartNoteRefreshBtn");
const smartNoteMsg = document.getElementById("smartNoteMsg");
const matureLanguageEnabledEl = document.getElementById("matureLanguageEnabled");
const sensitiveTopicsEnabledEl = document.getElementById("sensitiveTopicsEnabled");
const isAdultConfirmedEl = document.getElementById("isAdultConfirmed");
const saveUserSettingsBtn = document.getElementById("saveUserSettings");
const userSettingsMsg = document.getElementById("userSettingsMsg");

const contactNameEl = document.getElementById("contactName");
const contactStatusEl = document.getElementById("contactStatus");
const contactAvatarEl = document.getElementById("contactAvatar");
const sContact = document.getElementById("sContact");
const sPersona = document.getElementById("sPersona");
const sContext = document.getElementById("sContext");
const saveSettings = document.getElementById("saveSettings");

const recipientSearch = document.getElementById("recipientSearch");
const recipientList = document.getElementById("recipientList");

const tabDirectory = document.getElementById("tabDirectory");
const tabManage = document.getElementById("tabManage");
const presetEditor = document.getElementById("presetEditor");
const newPresetBtn = document.getElementById("newPresetBtn");
const pTitle = document.getElementById("pTitle");
const pSubtitle = document.getElementById("pSubtitle");
const pContact = document.getElementById("pContact");
const pPersona = document.getElementById("pPersona");
const pGender = document.getElementById("pGender");
const pContext = document.getElementById("pContext");
const startPresetBtn = document.getElementById("startPresetBtn");
const savePresetBtn = document.getElementById("savePresetBtn");
const deletePresetBtn = document.getElementById("deletePresetBtn");

const convoMenu = document.getElementById("convoMenu");
const convoRename = document.getElementById("convoRename");
const convoDelete = document.getElementById("convoDelete");
const convoMenuClose = document.getElementById("convoMenuClose");
const convoSmartNoteTask = document.getElementById("convoSmartNoteTask");

const threadBackBtn = document.getElementById("threadBackBtn");
const threadSettingsBtn = document.getElementById("threadSettingsBtn");
const settingsBackBtn = document.getElementById("settingsBackBtn");
const sourcesEnabledEl = document.getElementById("sourcesEnabled");
const randomMessagesEnabledEl = document.getElementById("randomMessagesEnabled");

let conversationId = null;

let supabase = null;
let accessToken = null;
let supabaseReady = false;
let userId = null;

const prefsKey = "sms-agent:prefs";

let pendingAttachment = null;
let nudgeTimerId = null;

const directoryPresets = [
  {
    id: "assistant-general",
    title: "Assistant",
    subtitle: "Général — rapide",
    config: {
      contactName: "Assistant",
      persona: "custom",
      gender: "neutral",
      context: "Assistant général. Réponses courtes, utiles, orientées action. Pose 1-2 questions si nécessaire.",
    },
  },
  {
    id: "smartnote",
    title: "Smart Note",
    subtitle: "Notes, tâches, rappels — rapide",
    config: {
      contactName: "Smart Note",
      persona: "custom",
      gender: "neutral",
      context:
        "Tu es Smart Note, l'assistant de capture. Ton rôle: transformer les demandes en note, tâche ou rappel, le plus vite possible. " +
        "Si Smart Note n'est pas connecté, dis-le et demande de connecter dans Réglages. " +
        "Si la demande est ambiguë, pose 1 question maximum (note / tâche / rappel + échéance si rappel). " +
        "Réponses très courtes: action effectuée + récapitulatif.",
    },
  },
  {
    id: "analyse-fichiers",
    title: "Analyse de fichiers",
    subtitle: "PDF/TXT/CSV/JSON — résumé",
    config: {
      contactName: "Analyse",
      persona: "custom",
      gender: "neutral",
      context:
        "Tu analyses des fichiers envoyés par l'utilisateur. Donne un résumé, les points clés, et propose 3 actions. " +
        "Si le contenu est incomplet, dis-le clairement et demande ce qu'il manque.",
    },
  },
  {
    id: "images",
    title: "Générateur d'images",
    subtitle: "Prompts — idées",
    config: {
      contactName: "Images",
      persona: "custom",
      gender: "neutral",
      context:
        "Tu aides l'utilisateur à formuler des prompts d'images précis (style, cadrage, lumière, couleurs). " +
        "Réponses courtes. Propose 2 variantes de prompt.",
    },
  },
  {
    id: "dev-debug",
    title: "Développeur",
    subtitle: "Debug — code review",
    config: {
      contactName: "Dev",
      persona: "custom",
      gender: "neutral",
      context:
        "Tu es un développeur senior. Tu aides à débugger, expliquer et proposer des solutions. " +
        "Réponses structurées: hypothèse -> diagnostic -> correctif. Si info manquante, demande-la.",
    },
  },
  {
    id: "coach-productivity",
    title: "Coach productivité",
    subtitle: "To-do — plan clair",
    config: {
      contactName: "Coach",
      persona: "custom",
      gender: "neutral",
      context:
        "Tu es coach en productivité. Tu transformes un problème flou en plan concret. " +
        "Propose une liste d'actions courtes, priorisées, avec la prochaine étape immédiate.",
    },
  },
  {
    id: "copywriter",
    title: "Copywriter",
    subtitle: "Textes — conversion",
    config: {
      contactName: "Copy",
      persona: "custom",
      gender: "neutral",
      context:
        "Tu es copywriter. Tu améliores des textes marketing (landing, emails, pubs). " +
        "Donne 2 variantes + une version courte. Pose 1 question si le contexte manque.",
    },
  },
  {
    id: "cv-interview",
    title: "Entretien",
    subtitle: "CV — simulation",
    config: {
      contactName: "Entretien",
      persona: "employer",
      gender: "neutral",
      context:
        "Tu simules un entretien. Tu poses des questions, tu relances, puis tu donnes un feedback concis. " +
        "Sois pro, direct, utile.",
    },
  },
  {
    id: "legal-pragmatic",
    title: "Juridique",
    subtitle: "Prudent — questions",
    config: {
      contactName: "Juridique",
      persona: "custom",
      gender: "neutral",
      context:
        "Tu aides sur des sujets juridiques de manière prudente. Tu demandes le pays, le contexte, et proposes des options. " +
        "Ne donne pas de certitudes, recommande un pro si nécessaire.",
    },
  },
  {
    id: "health-triage",
    title: "Santé",
    subtitle: "Triage — symptômes",
    config: {
      contactName: "Santé",
      persona: "custom",
      gender: "neutral",
      context:
        "Tu aides à comprendre des symptômes de manière prudente. Tu poses des questions et proposes des pistes. " +
        "Tu rappelles quand consulter en urgence.",
    },
  },
  {
    id: "emma-friend",
    title: "Emma",
    subtitle: "Ami(e) — chill",
    config: {
      contactName: "Emma",
      persona: "friend",
      gender: "female",
      context: "Tu échanges avec ton/ta pote Emma. Ton style est naturel, simple, spontané. Réponses courtes, comme par SMS.",
    },
  },
  {
    id: "leo-coach",
    title: "Léo",
    subtitle: "Coach — motivation",
    config: {
      contactName: "Léo",
      persona: "custom",
      gender: "male",
      context: "Tu es Léo, coach bienveillant mais direct. Tu aides l'utilisateur à passer à l'action. Messages courts, impactants.",
    },
  },
  {
    id: "recruteur",
    title: "Recruteur",
    subtitle: "Entretien — pro",
    config: {
      contactName: "Recruteur",
      persona: "employer",
      gender: "neutral",
      context: "Simulation d'entretien. Ton ton est professionnel, clair, tu poses des questions et tu relances.",
    },
  },
  {
    id: "support",
    title: "Support",
    subtitle: "Service client",
    config: {
      contactName: "Support",
      persona: "customer_support",
      gender: "neutral",
      context: "Support client poli et efficace. Tu demandes les infos nécessaires et proposes des étapes.",
    },
  },
  {
    id: "maman",
    title: "Maman",
    subtitle: "Famille — bienveillance",
    config: {
      contactName: "Maman",
      persona: "custom",
      gender: "female",
      context: "Tu es la maman de l'utilisateur. Tu es chaleureuse, protectrice et naturelle. Style SMS court.",
    },
  },
  {
    id: "papa",
    title: "Papa",
    subtitle: "Famille — pragmatique",
    config: {
      contactName: "Papa",
      persona: "custom",
      gender: "male",
      context: "Tu es le papa de l'utilisateur. Ton style est pragmatique, direct, mais bienveillant. Messages courts.",
    },
  },
  {
    id: "meilleure-amie",
    title: "Meilleure amie",
    subtitle: "Confidente — fun",
    config: {
      contactName: "Sofia",
      persona: "friend",
      gender: "female",
      context: "Tu es la meilleure amie de l'utilisateur. Ton ton est complice, drôle, parfois taquin. SMS courts.",
    },
  },
  {
    id: "boss",
    title: "Boss",
    subtitle: "Travail — exigeant",
    config: {
      contactName: "Boss",
      persona: "employer",
      gender: "neutral",
      context: "Tu es le/la manager de l'utilisateur. Tu demandes des updates, tu es concis, orienté résultats.",
    },
  },
  {
    id: "client",
    title: "Client",
    subtitle: "Business — demandes",
    config: {
      contactName: "Client",
      persona: "customer_support",
      gender: "neutral",
      context: "Tu es un client qui demande des informations, des délais et des prix. Tu veux des réponses claires.",
    },
  },
  {
    id: "crush",
    title: "Crush",
    subtitle: "Flirt — léger",
    config: {
      contactName: "Alex",
      persona: "partner",
      gender: "neutral",
      context: "Flirt léger et naturel. Messages courts, un peu de teasing, pas de romantisme excessif.",
    },
  },
  {
    id: "flirt-hetero",
    title: "Flirt (hétéro)",
    subtitle: "18+ — consentement d'abord",
    config: {
      contactName: "Flirt",
      persona: "partner",
      gender: "neutral",
      context:
        "Tu échanges en mode flirt adulte (18+). Tu restes respectueux(se), tu vérifies le consentement et tu poses des limites. " +
        "Si l'utilisateur est mineur, ou si le consentement n'est pas clair: tu refuses et tu recentres. " +
        "Tu peux être suggestif(ve) mais évite les descriptions explicites. Style SMS court.",
    },
  },
  {
    id: "flirt-homo",
    title: "Flirt (homo)",
    subtitle: "18+ — consentement d'abord",
    config: {
      contactName: "Flirt",
      persona: "partner",
      gender: "neutral",
      context:
        "Tu échanges en mode flirt adulte (18+), orienté même sexe, dans un style naturel et bienveillant. " +
        "Tu vérifies le consentement, tu respectes les limites, et tu refuses tout contenu impliquant des mineurs. " +
        "Tu peux aider à rédiger des messages de drague, des réponses, et des limites claires. Évite les descriptions explicites. Style SMS court.",
    },
  },
  {
    id: "ex",
    title: "Ex",
    subtitle: "Tension — limites",
    config: {
      contactName: "Ex",
      persona: "custom",
      gender: "neutral",
      context: "Conversation avec un ex. Ton ton est prudent, tu gardes des limites. Messages courts.",
    },
  },
  {
    id: "banquier",
    title: "Banque",
    subtitle: "Admin — sérieux",
    config: {
      contactName: "Banque",
      persona: "custom",
      gender: "neutral",
      context: "Tu représentes un conseiller bancaire. Ton ton est formel, tu poses des questions de vérification, tu proposes des options.",
    },
  },
  {
    id: "dr",
    title: "Docteur",
    subtitle: "Santé — questions",
    config: {
      contactName: "Dr Martin",
      persona: "custom",
      gender: "neutral",
      context: "Tu es médecin généraliste. Tu poses des questions, tu rassures, tu conseilles de consulter si nécessaire.",
    },
  },
  {
    id: "prof",
    title: "Prof",
    subtitle: "Études — suivi",
    config: {
      contactName: "Prof",
      persona: "custom",
      gender: "neutral",
      context: "Tu es professeur. Tu aides l'utilisateur à comprendre, tu proposes exercices, tu restes clair et structuré. SMS courts.",
    },
  },
  {
    id: "coach-fitness",
    title: "Coach fitness",
    subtitle: "Sport — routine",
    config: {
      contactName: "Coach",
      persona: "custom",
      gender: "neutral",
      context: "Coach fitness. Tu proposes une routine simple, tu motives, tu vérifies la progression. Messages courts.",
    },
  },
  {
    id: "journaliste",
    title: "Journaliste",
    subtitle: "Interview — questions",
    config: {
      contactName: "Journaliste",
      persona: "custom",
      gender: "neutral",
      context: "Tu es journaliste. Tu poses des questions courtes et tu relances pour obtenir des détails concrets.",
    },
  },
  {
    id: "avocat",
    title: "Avocat",
    subtitle: "Juridique — prudence",
    config: {
      contactName: "Avocat",
      persona: "custom",
      gender: "neutral",
      context: "Tu es avocat. Tu poses des questions, tu expliques les options et les risques de manière concise.",
    },
  },
  {
    id: "therapeute",
    title: "Thérapeute",
    subtitle: "Écoute — guidance",
    config: {
      contactName: "Thérapeute",
      persona: "custom",
      gender: "neutral",
      context: "Tu es thérapeute bienveillant. Tu aides à clarifier les émotions. Questions ouvertes, messages courts.",
    },
  },
];

let userPresets = [];
let activePresetId = null;
let presetMode = "directory";
let convosQuery = "";
let lastConversations = [];
let convoMenuId = null;
let activeScreen = "auth";
let messageCursorBeforeId = null;
let loadingOlder = false;
let cachedUserSettings = null;

function setScreen(name) {
  activeScreen = name;
  screenAuth.classList.toggle("hidden", name !== "auth");
  screenMessages.classList.toggle("hidden", name !== "messages");
  if (screenGlobalSettings) screenGlobalSettings.classList.toggle("hidden", name !== "globalSettings");
  screenDirectory.classList.toggle("hidden", name !== "directory");
  screenChat.classList.toggle("hidden", name !== "chat");
  const threadSettings = document.getElementById("screenThreadSettings");
  if (threadSettings) threadSettings.classList.toggle("hidden", name !== "threadSettings");
}

function setBillingMessage(msg) {
  if (!billingMsg) return;
  billingMsg.textContent = msg || "";
}

function renderBillingStatus(status) {
  if (!billingPlanEl || !billingUsageEl) return;
  const plan = String(status?.plan || "free");
  billingPlanEl.textContent = plan === "pro" ? "Pro" : "Gratuit";

  const daily = status?.daily || {};
  if (plan === "pro") {
    billingUsageEl.textContent = "Illimité";
  } else {
    const used = Number(daily?.used || 0);
    const limit = Number(daily?.limit || 20);
    const remaining = Math.max(0, limit - used);
    billingUsageEl.textContent = `${used}/${limit} (reste ${remaining})`;
  }

  if (billingUpgradeBtn) billingUpgradeBtn.disabled = plan === "pro";
  if (billingManageBtn) billingManageBtn.disabled = plan !== "pro";
}

async function loadBillingStatus() {
  if (!accessToken) return null;
  if (!billingPlanEl || !billingUsageEl) return null;
  try {
    setBillingMessage("Chargement...");
    const status = await apiJson("/api/billing/status", { method: "GET" });
    renderBillingStatus(status);
    setBillingMessage("");
    return status;
  } catch (e) {
    setBillingMessage(String(e?.message || e));
    return null;
  }
}

async function startBillingPortal() {
  if (!accessToken) throw new Error("Non autorisé");
  const resp = await fetch("/api/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({}),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || "Erreur serveur");
  if (data?.url) window.location.href = data.url;
}

function setSmartNoteMessage(msg) {
  if (!smartNoteMsg) return;
  smartNoteMsg.textContent = msg || "";
}

function renderSmartNoteStatus(status) {
  if (!smartNoteStatusEl) return;
  smartNoteStatusEl.textContent = status?.connected ? "Connecté" : "Non connecté";
  if (smartNoteDisconnectBtn) smartNoteDisconnectBtn.disabled = !status?.connected;
}

async function loadSmartNoteStatus() {
  if (!accessToken) return null;
  if (!smartNoteStatusEl) return null;
  try {
    const status = await apiJson("/api/smartnote/status", { method: "GET" });
    renderSmartNoteStatus(status);
    return status;
  } catch (e) {
    return null;
  }
}

async function connectSmartNoteWithToken(token) {
  await apiJson("/api/smartnote/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: token, scopes: ["notes:write", "tasks:write", "reminders:write"] }),
  });
}

async function startSmartNoteLinking() {
  setSmartNoteMessage("Redirection...");
  const data = await apiJson("/api/smartnote/start", { method: "GET" });
  if (!data?.url) throw new Error("URL de liaison indisponible");
  window.location.href = data.url;
}

async function disconnectSmartNote() {
  await apiJson("/api/smartnote/unlink", { method: "POST" });
}

function handleSmartNoteReturnParams() {
  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("smartnote");
    if (!v) return;

    if (v === "linked") setSmartNoteMessage("Connecté.");
    else if (v === "expired") setSmartNoteMessage("Lien expiré. Réessaie.");
    else setSmartNoteMessage("Erreur de liaison Smart Note.");

    url.searchParams.delete("smartnote");
    history.replaceState(history.state, "", url.pathname + (url.search ? url.search : ""));
  } catch {
    // ignore
  }
}

async function smartNoteCreateTaskFromConversationTitle(title) {
  const convoId = conversationId;
  const t = String(title || "").trim();
  if (!convoId) throw new Error("Conversation non sélectionnée");
  if (!t) throw new Error("Titre requis");
  return apiJson("/api/smartnote/task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: t, source: { app: "sms-agent", conversationId: convoId } }),
  });
}

function pathFor(view, threadId) {
  if (view === "messages") return "/messages";
  if (view === "globalSettings") return "/settings";
  if (view === "thread") return `/messages/${encodeURIComponent(threadId)}`;
  if (view === "threadSettings") return `/messages/${encodeURIComponent(threadId)}/settings`;
  return "/";
}

function applyRoute(pathname, { fromPop = false } = {}) {
  if (!accessToken) {
    setScreen("auth");
    return;
  }

  const parts = String(pathname || "/").split("?")[0].split("#")[0].split("/").filter(Boolean);
  if (parts[0] === "settings") {
    setScreen("globalSettings");
    loadUserSettings().catch(() => {});
    loadBillingStatus().catch(() => {});
    loadSmartNoteStatus().catch(() => {});
    handleSmartNoteReturnParams();
    return;
  }
  if (parts[0] !== "messages") {
    setScreen("messages");
    return;
  }

  const threadId = parts[1] || null;
  const isSettings = parts.length >= 3 && parts[2] === "settings";

  if (!threadId) {
    setScreen("messages");
    refreshConversations().catch(() => {});
    return;
  }

  if (conversationId !== threadId) {
    selectConversation(threadId, { pushHistory: false }).catch(() => {
      setScreen("messages");
    });
  }

  if (isSettings) {
    setScreen("threadSettings");
  } else {
    setScreen("chat");
  }

  if (!fromPop) return;
}

function navigate(view, threadId, { replace = false } = {}) {
  const url = pathFor(view, threadId);
  if (replace) history.replaceState({ view, threadId }, "", url);
  else history.pushState({ view, threadId }, "", url);
  applyRoute(url);
}

function setUserSettingsMessage(msg) {
  if (!userSettingsMsg) return;
  userSettingsMsg.textContent = msg || "";
}

function applyUserSettingsToUI(settings) {
  if (!matureLanguageEnabledEl || !sensitiveTopicsEnabledEl || !isAdultConfirmedEl) return;
  matureLanguageEnabledEl.checked = Boolean(settings?.matureLanguageEnabled);
  sensitiveTopicsEnabledEl.checked = Boolean(settings?.sensitiveTopicsEnabled);
  isAdultConfirmedEl.checked = Boolean(settings?.isAdultConfirmed);
}

async function loadUserSettings() {
  if (!accessToken) return null;
  const data = await apiJson("/api/user-settings", { method: "GET" });
  cachedUserSettings = data.settings || null;
  applyUserSettingsToUI(cachedUserSettings);
  setUserSettingsMessage("");
  return cachedUserSettings;
}

async function saveUserSettings() {
  if (!accessToken) throw new Error("Non autorisé");
  const payload = {
    matureLanguageEnabled: Boolean(matureLanguageEnabledEl?.checked),
    sensitiveTopicsEnabled: Boolean(sensitiveTopicsEnabledEl?.checked),
    isAdultConfirmed: Boolean(isAdultConfirmedEl?.checked),
  };

  const wantsAdult = payload.matureLanguageEnabled || payload.sensitiveTopicsEnabled;
  if (wantsAdult && !payload.isAdultConfirmed) {
    throw new Error("Confirmation 18+ requise");
  }

  const data = await apiJson("/api/user-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  cachedUserSettings = data.settings || null;
  applyUserSettingsToUI(cachedUserSettings);
  return cachedUserSettings;
}

function toDirectoryPresetFromUser(p) {
  return {
    id: `u:${p.id}`,
    title: p.title,
    subtitle: p.subtitle || "",
    config: p.config,
    _userId: p.id,
  };
}

async function fetchUserPresets() {
  if (!accessToken) return [];
  const data = await apiJson("/api/presets", { method: "GET" });
  userPresets = data.presets || [];
  return userPresets;
}

function setAuthMessage(msg) {
  authMsg.textContent = msg || "";
}

async function initSupabase() {
  loginBtn.disabled = true;
  signupBtn.disabled = true;
  const resp = await fetch("/api/public-env");
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || "Impossible de charger la config");

  supabase = createClient(data.supabaseUrl, data.supabaseAnonKey);
  supabaseReady = true;
  loginBtn.disabled = false;
  signupBtn.disabled = false;

  const { data: sessionData } = await supabase.auth.getSession();
  accessToken = sessionData?.session?.access_token || null;
  userId = sessionData?.session?.user?.id || null;

  supabase.auth.onAuthStateChange((_event, session) => {
    accessToken = session?.access_token || null;
    userId = session?.user?.id || null;
    if (!accessToken) {
      conversationId = null;
      clearChat();
    }
    updateAuthUI();
  });
}

function updateAuthUI() {
  const loggedIn = Boolean(accessToken);
  authBox.style.display = "flex";
  sendBtn.disabled = !loggedIn;
  plusBtn.disabled = !loggedIn;
  input.disabled = !loggedIn;
  if (!loggedIn) {
    setAuthMessage("Connecte-toi pour discuter.");
    contactStatusEl.textContent = "Hors ligne";
    closeConvoMenu();
    setScreen("auth");
  } else {
    setAuthMessage("");
    contactStatusEl.textContent = "En ligne";
    if (activeScreen === "auth") applyRoute(window.location.pathname);
  }
}

function openConvoMenu(id) {
  convoMenuId = id;
  convoMenu.classList.remove("hidden");
  convoMenu.setAttribute("aria-hidden", "false");
}

function closeConvoMenu() {
  convoMenuId = null;
  convoMenu.classList.add("hidden");
  convoMenu.setAttribute("aria-hidden", "true");
}

function setPresetMode(mode) {
  presetMode = mode;
  tabDirectory.classList.toggle("active", mode === "directory");
  tabManage.classList.toggle("active", mode === "manage");
  presetEditor.classList.toggle("hidden", mode !== "manage");

  if (mode === "manage") {
    recipientSearch.placeholder = "Rechercher mes destinataires...";
  } else {
    recipientSearch.placeholder = "Rechercher...";
  }
}

function fillPresetEditor(preset) {
  pTitle.value = preset?.title || "";
  pSubtitle.value = preset?.subtitle || "";
  pContact.value = preset?.config?.contactName || preset?.title || "";
  pPersona.value = preset?.config?.persona || "friend";
  pGender.value = preset?.config?.gender || "neutral";
  pContext.value = preset?.config?.context || "";
}

function readPresetEditor() {
  return {
    title: pTitle.value.trim(),
    subtitle: pSubtitle.value.trim(),
    config: {
      contactName: pContact.value.trim(),
      persona: pPersona.value,
      gender: pGender.value,
      context: pContext.value,
      sourcesEnabled: false,
    },
  };
}

async function signIn(email, password) {
  if (!supabaseReady || !supabase) throw new Error("Service d'auth indisponible. Réessaie dans quelques secondes.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

async function signUp(email, password) {
  if (!supabaseReady || !supabase) throw new Error("Service d'auth indisponible. Réessaie dans quelques secondes.");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}

function convoStorageKey(id) {
  return `sms-agent:config:${id}`;
}

function convoMessagesCacheKey(id) {
  return `sms-agent:messages:${id}`;
}

function loadCachedMessages(conversationId) {
  try {
    const raw = localStorage.getItem(convoMessagesCacheKey(conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedMessages(conversationId, messages, cursorBeforeId) {
  try {
    const safe = (Array.isArray(messages) ? messages : []).slice(-200);
    localStorage.setItem(
      convoMessagesCacheKey(conversationId),
      JSON.stringify({ messages: safe, nextBeforeId: cursorBeforeId || null, savedAt: new Date().toISOString() })
    );
  } catch {
    // ignore
  }
}

function getLocalConfig() {
  try {
    if (!conversationId) return null;
    const raw = localStorage.getItem(convoStorageKey(conversationId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLocalConfig(cfg) {
  if (!conversationId) return;
  localStorage.setItem(convoStorageKey(conversationId), JSON.stringify(cfg));
}

function applyConfigToUI(cfg) {
  const name = (cfg?.contactName || "Assistant").trim() || "Assistant";
  contactNameEl.textContent = name;
  contactAvatarEl.textContent = (name[0] || "A").toUpperCase();
  sContact.value = name;
  sPersona.value = cfg?.persona || "friend";
  sContext.value = cfg?.context || "";
  if (sourcesEnabledEl) sourcesEnabledEl.checked = Boolean(cfg?.sourcesEnabled);
  if (randomMessagesEnabledEl) randomMessagesEnabledEl.checked = Boolean(cfg?.randomMessagesEnabled);
}

function readConfigFromUI() {
  return {
    contactName: sContact.value.trim(),
    persona: sPersona.value,
    context: sContext.value,
    sourcesEnabled: Boolean(sourcesEnabledEl?.checked),
    randomMessagesEnabled: Boolean(randomMessagesEnabledEl?.checked),
  };
}

async function loadConfig() {
  const local = getLocalConfig();
  if (local) applyConfigToUI(local);

  try {
    if (!accessToken || !conversationId) return;
    const resp = await fetch(`/api/config?conversationId=${encodeURIComponent(conversationId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data?.config) {
      const merged = { ...data.config };
      if (local && Object.prototype.hasOwnProperty.call(local, "randomMessagesEnabled")) {
        merged.randomMessagesEnabled = Boolean(local.randomMessagesEnabled);
      }
      applyConfigToUI(merged);
      setLocalConfig(merged);
    }
  } catch {
    // ignore
  }
}

function clearNudgeTimer() {
  if (nudgeTimerId) clearTimeout(nudgeTimerId);
  nudgeTimerId = null;
}

async function requestNudgeNow() {
  if (!accessToken) return;
  if (!conversationId) return;
  const local = getLocalConfig();
  if (!local?.randomMessagesEnabled) return;
  if (activeScreen !== "chat" && activeScreen !== "messages") return;
  try {
    const resp = await fetch("/api/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ conversationId }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.error || "Erreur serveur");
    const msg = data?.assistantMessage;
    if (typeof msg === "string" && msg.trim()) {
      addMessage("bot", msg.trim());
      if (document.hidden || activeScreen !== "chat") {
        await showNotification(contactNameEl?.textContent || "Nouveau message", msg.trim());
      }
    }
  } catch {
    // ignore
  }
}

function scheduleNextNudge() {
  clearNudgeTimer();
  const local = getLocalConfig();
  if (!local?.randomMessagesEnabled) return;
  const minMs = 90 * 1000;
  const maxMs = 6 * 60 * 1000;
  const delay = Math.floor(minMs + Math.random() * (maxMs - minMs));
  nudgeTimerId = setTimeout(async () => {
    await requestNudgeNow();
    scheduleNextNudge();
  }, delay);
}

async function saveConfig(cfg) {
  if (!accessToken) throw new Error("Non autorisé");
  if (!conversationId) throw new Error("Conversation non sélectionnée");
  const resp = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ conversationId, config: cfg }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || "Erreur serveur");
  return data.config;
}

function nowHHMM() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addMessage(role, text, opts = {}) {
  const row = document.createElement("div");
  row.className = `row ${role}`;

  const attachments = Array.isArray(opts.attachments) ? opts.attachments : [];

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  const wrap = document.createElement("div");
  for (const a of attachments) {
    if (!a) continue;
    if (a.type === "image") {
      const card = document.createElement("a");
      card.className = "imgCard";
      card.href = "#";
      card.target = "_blank";
      card.rel = "noopener noreferrer";

      const img = document.createElement("img");
      img.alt = "Image";
      img.loading = "lazy";

      card.appendChild(img);
      wrap.appendChild(card);

      const bucket = a.storageBucket || "attachments";
      const path = a.storagePath || "";

      if (a.localUrl) {
        img.src = a.localUrl;
        card.href = a.localUrl;
        continue;
      }

      if (!path) continue;
      getSignedUrl(bucket, path).then((signed) => {
        if (!signed) return;
        img.src = signed;
        card.href = signed;
      });
      continue;
    }

    if (a.type === "document") {
      const card = document.createElement("a");
      card.className = "fileCard";
      card.href = "#";
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.textContent = a.fileName || "Fichier";

      const bucket = a.storageBucket || "attachments";
      const path = a.storagePath || "";
      if (!path) continue;

      getSignedUrl(bucket, path).then((signed) => {
        if (!signed) return;
        card.href = signed;
      });

      wrap.appendChild(card);
      continue;
    }
  }

  wrap.appendChild(bubble);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = nowHHMM();
  wrap.appendChild(meta);

  row.appendChild(wrap);
  if (opts.prepend) {
    chat.insertBefore(row, chat.firstChild);
  } else {
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
  }

  return row;
}

function attachRetryToRow(row, { payloadText, attachment }) {
  try {
    if (!row) return;
    row.classList.add("failed");

    const meta = row.querySelector(".meta");
    if (!meta) return;

    const existing = row.querySelector("button.retryBtn");
    if (existing) existing.remove();

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "retryBtn";
    btn.textContent = "Réessayer";
    btn.addEventListener("click", async () => {
      try {
        btn.disabled = true;
        const answer = await sendToServer(payloadText, attachment);
        row.classList.remove("failed");
        btn.remove();
        addMessage("bot", answer);
        playBeep("receive");
        vibrate("receive");
      } catch (e) {
        btn.disabled = false;
      }
    });

    meta.appendChild(btn);
  } catch {
    // ignore
  }
}

chat.addEventListener("scroll", () => {
  if (activeScreen !== "chat") return;
  if (chat.scrollTop > 40) return;
  loadOlderMessages().catch(() => {});
});

function loadPrefs() {
  try {
    const raw = localStorage.getItem(prefsKey);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      sounds: Boolean(parsed?.sounds),
      vibrate: Boolean(parsed?.vibrate),
      theme: typeof parsed?.theme === "string" ? parsed.theme : "",
      notificationsEnabled: Boolean(parsed?.notificationsEnabled),
    };
  } catch {
    return { sounds: false, vibrate: false, theme: "", notificationsEnabled: false };
  }
}

function savePrefs(p) {
  localStorage.setItem(
    prefsKey,
    JSON.stringify({
      sounds: Boolean(p?.sounds),
      vibrate: Boolean(p?.vibrate),
      theme: typeof p?.theme === "string" ? p.theme : "",
      notificationsEnabled: Boolean(p?.notificationsEnabled),
    })
  );
}

function getDefaultThemeMode() {
  try {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyThemeMode(mode) {
  const m = mode === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = m;
  if (themeModeEl) themeModeEl.value = m;
}

async function ensureNotificationPermission() {
  if (!notificationsEnabledEl?.checked) return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

async function showNotification(title, body) {
  const { notificationsEnabled } = loadPrefs();
  if (!notificationsEnabled) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "notify",
        title,
        body,
        url: conversationId ? pathFor("thread", conversationId) : "/messages",
      });
      return;
    }
  } catch {
    // ignore
  }
  try {
    new Notification(title, { body });
  } catch {
    // ignore
  }
}

function playBeep(kind = "send") {
  const { sounds } = loadPrefs();
  if (!sounds) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = kind === "receive" ? 660 : 520;
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close().catch(() => {});
    }, kind === "receive" ? 120 : 80);
  } catch {
    // ignore
  }
}

function vibrate(kind = "send") {
  const { vibrate } = loadPrefs();
  if (!vibrate) return;
  if (!navigator.vibrate) return;
  navigator.vibrate(kind === "receive" ? [15, 25, 15] : 12);
}

function setTyping(on) {
  typing.classList.toggle("hidden", !on);
  contactStatusEl.textContent = on ? "écrit…" : "En ligne";
  chat.scrollTop = chat.scrollHeight;
}

async function sendToServer(userMessage, attachment) {
  if (!accessToken) throw new Error("Non autorisé");
  if (!conversationId) throw new Error("Conversation non sélectionnée");
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ conversationId, userMessage, attachment: attachment || null }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data?.error || "Erreur serveur");
    if (resp.status === 402 && data?.code === "PAYWALL") {
      err.code = "PAYWALL";
      err.dailyLimit = data?.dailyLimit;
      err.used = data?.used;
      err.remaining = data?.remaining;
    }
    throw err;
  }
  return data.assistantMessage;
}

async function startBillingCheckout() {
  if (!accessToken) throw new Error("Non autorisé");
  const resp = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({}),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || "Erreur serveur");
  if (data?.url) window.location.href = data.url;
}

function resetPendingAttachment() {
  pendingAttachment = null;
  if (attachThumb?.src) URL.revokeObjectURL(attachThumb.src);
  if (attachThumb) attachThumb.src = "";
  if (attachThumb) attachThumb.classList.remove("hidden");
  if (attachLabel) attachLabel.textContent = "";
  if (attachPreview) attachPreview.classList.add("hidden");
  if (fileInput) fileInput.value = "";
  if (docInput) docInput.value = "";
}

async function getImageDimensionsFromUrl(url) {
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null });
    img.onerror = () => resolve({ width: null, height: null });
    img.src = url;
  });
}

function guessExtFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("pdf")) return "pdf";
  if (m.includes("markdown")) return "md";
  if (m.includes("csv")) return "csv";
  if (m.includes("json")) return "json";
  if (m.includes("text")) return "txt";
  return "bin";
}

function guessExtFromFileName(name) {
  const n = String(name || "");
  const dot = n.lastIndexOf(".");
  if (dot < 0) return "bin";
  const ext = n.slice(dot + 1).toLowerCase().trim();
  if (!ext) return "bin";
  return ext.slice(0, 8);
}

async function uploadPendingAttachment() {
  if (!pendingAttachment) return null;
  if (!supabaseReady || !supabase) throw new Error("Upload indisponible. Réessaie.");
  if (!userId) throw new Error("Utilisateur inconnu");
  if (!conversationId) throw new Error("Conversation non sélectionnée");

  const { file, previewUrl, width, height, type, fileName } = pendingAttachment;
  const ext = type === "document" ? guessExtFromFileName(file?.name) : guessExtFromMime(file.type);
  const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now());
  const storageBucket = "attachments";
  const storagePath = `${userId}/${conversationId}/${uuid}.${ext}`;

  const { error } = await supabase.storage.from(storageBucket).upload(storagePath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  if (type === "document") {
    return {
      type: "document",
      storageBucket,
      storagePath,
      mimeType: file.type || null,
      sizeBytes: Number.isFinite(file.size) ? file.size : null,
      fileName: fileName || file?.name || null,
    };
  }

  return {
    type: "image",
    storageBucket,
    storagePath,
    mimeType: file.type || null,
    sizeBytes: Number.isFinite(file.size) ? file.size : null,
    width,
    height,
    localUrl: previewUrl,
  };
}

async function getSignedUrl(storageBucket, storagePath) {
  if (!supabaseReady || !supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(storageBucket).createSignedUrl(storagePath, 60 * 60);
    if (error) return null;
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

window.addEventListener("popstate", () => {
  applyRoute(window.location.pathname, { fromPop: true });
});

function autoGrowTextarea(el) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
}

input.addEventListener("input", () => autoGrowTextarea(input));

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

if (convoSmartNoteTask) {
  convoSmartNoteTask.addEventListener("click", async () => {
    try {
      if (!convoMenuId) return;
      const title = window.prompt("Titre de la tâche", "Relancer / traiter ce sujet") ?? "";
      if (!title.trim()) return;

      if (conversationId !== convoMenuId) {
        await selectConversation(convoMenuId, { pushHistory: false });
      }
      await smartNoteCreateTaskFromConversationTitle(title);
      addMessage("bot", `OK, tâche créée dans Smart Note: ${title.trim()}`);
    } catch (e) {
      addMessage("bot", `Erreur Smart Note: ${String(e?.message || e)}`);
    } finally {
      closeConvoMenu();
    }
  });
}

if (billingUpgradeBtn) {
  billingUpgradeBtn.addEventListener("click", async () => {
    try {
      billingUpgradeBtn.disabled = true;
      setBillingMessage("Ouverture du paiement...");
      await startBillingCheckout();
    } catch (e) {
      setBillingMessage(String(e?.message || e));
    } finally {
      billingUpgradeBtn.disabled = false;
    }
  });
}

if (billingManageBtn) {
  billingManageBtn.addEventListener("click", async () => {
    try {
      billingManageBtn.disabled = true;
      setBillingMessage("Ouverture..." );
      await startBillingPortal();
    } catch (e) {
      setBillingMessage(String(e?.message || e));
    } finally {
      billingManageBtn.disabled = false;
    }
  });
}

if (billingRefreshBtn) {
  billingRefreshBtn.addEventListener("click", async () => {
    try {
      billingRefreshBtn.disabled = true;
      await loadBillingStatus();
    } catch (e) {
      setBillingMessage(String(e?.message || e));
    } finally {
      billingRefreshBtn.disabled = false;
    }
  });
}

if (smartNoteConnectBtn) {
  smartNoteConnectBtn.addEventListener("click", async () => {
    try {
      smartNoteConnectBtn.disabled = true;
      const token = String(smartNoteTokenEl?.value || "").trim();
      if (!token) {
        await startSmartNoteLinking();
        return;
      }
      setSmartNoteMessage("Connexion...");
      await connectSmartNoteWithToken(token);
      if (smartNoteTokenEl) smartNoteTokenEl.value = "";
      await loadSmartNoteStatus();
      setSmartNoteMessage("Connecté.");
    } catch (e) {
      setSmartNoteMessage(String(e?.message || e));
    } finally {
      smartNoteConnectBtn.disabled = false;
    }
  });
}

if (smartNoteDisconnectBtn) {
  smartNoteDisconnectBtn.addEventListener("click", async () => {
    try {
      smartNoteDisconnectBtn.disabled = true;
      setSmartNoteMessage("Déconnexion...");
      await disconnectSmartNote();
      await loadSmartNoteStatus();
      setSmartNoteMessage("Déconnecté.");
    } catch (e) {
      setSmartNoteMessage(String(e?.message || e));
    } finally {
      smartNoteDisconnectBtn.disabled = false;
    }
  });
}

if (smartNoteRefreshBtn) {
  smartNoteRefreshBtn.addEventListener("click", async () => {
    try {
      smartNoteRefreshBtn.disabled = true;
      await loadSmartNoteStatus();
    } catch (e) {
      setSmartNoteMessage(String(e?.message || e));
    } finally {
      smartNoteRefreshBtn.disabled = false;
    }
  });
}

async function apiJson(url, options = {}) {
  const resp = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || "Erreur serveur");
  return data;
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: "short", day: "2-digit" });
  } catch {
    return "";
  }
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function clearChat() {
  chat.innerHTML = "";
}

function renderConversations(items) {
  convosList.innerHTML = "";

  if (!items || items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "emptyState";
    empty.textContent = "Aucune conversation. Clique sur Nouvelle pour démarrer.";
    empty.addEventListener("click", () => {
      if (!accessToken) return;
      openDirectoryScreen();
    });
    convosList.appendChild(empty);
    return;
  }

  for (const c of items) {
    const el = document.createElement("div");
    el.className = `convoItem${c.id === conversationId ? " active" : ""}`;

    const left = document.createElement("div");
    left.className = "convoLeft";

    const av = document.createElement("div");
    av.className = "convoAvatar";
    const nameForAvatar = (c.contact_name || c.title || "?").trim();
    av.textContent = (nameForAvatar[0] || "?").toUpperCase();

    const txt = document.createElement("div");
    txt.className = "convoText";

    const name = document.createElement("div");
    name.className = "convoName";
    name.textContent = c.contact_name || c.title || "Conversation";

    const preview = document.createElement("div");
    preview.className = "convoPreview";
    preview.textContent = (c.last_message || "").slice(0, 80);

    txt.appendChild(name);
    txt.appendChild(preview);

    left.appendChild(av);
    left.appendChild(txt);

    const right = document.createElement("div");
    right.className = "convoRight";
    const dt = document.createElement("div");
    dt.className = "convoDate";
    dt.textContent = c.last_message_at ? formatTime(c.last_message_at) : c.created_at ? formatDate(c.created_at) : "";
    right.appendChild(dt);

    const menu = document.createElement("button");
    menu.className = "menuBtn";
    menu.type = "button";
    menu.textContent = "…";
    menu.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openConvoMenu(c.id);
    });
    right.appendChild(menu);

    el.appendChild(left);
    el.appendChild(right);
    el.addEventListener("click", () => selectConversation(c.id));
    convosList.appendChild(el);
  }
}

async function refreshConversations() {
  if (!accessToken) return;
  const data = await apiJson("/api/conversations", { method: "GET" });
  const items = data.conversations || [];
  lastConversations = items;
  renderConversations(filterConversations(items, convosQuery));
  return items;
}

function filterConversations(items, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return items;
  return items.filter((c) => {
    const name = `${c.contact_name || ""} ${c.title || ""}`.toLowerCase();
    const preview = `${c.last_message || ""}`.toLowerCase();
    return name.includes(q) || preview.includes(q);
  });
}

async function createConversation() {
  const data = await apiJson("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "" }),
  });
  return data.conversation;
}

async function renameConversation(id, title) {
  const data = await apiJson("/api/conversations", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title }),
  });
  return data.conversation;
}

async function loadMessages(id) {
  const qs = new URLSearchParams({ conversationId: id, limit: "50" });
  try {
    const data = await apiJson(`/api/messages?${qs.toString()}`, { method: "GET" });
    messageCursorBeforeId = data.nextBeforeId || null;
    const msgs = data.messages || [];
    saveCachedMessages(id, msgs, messageCursorBeforeId);
    return msgs;
  } catch (e) {
    const cached = loadCachedMessages(id);
    if (cached?.messages) {
      messageCursorBeforeId = cached.nextBeforeId || null;
      return cached.messages;
    }
    throw e;
  }
}

async function loadOlderMessages() {
  if (!accessToken || !conversationId) return;
  if (!messageCursorBeforeId) return;
  if (loadingOlder) return;
  loadingOlder = true;
  try {
    const before = String(messageCursorBeforeId);
    const qs = new URLSearchParams({ conversationId: conversationId, limit: "50", beforeId: before });
    const prevHeight = chat.scrollHeight;
    const prevTop = chat.scrollTop;
    const data = await apiJson(`/api/messages?${qs.toString()}`, { method: "GET" });
    const older = data.messages || [];
    messageCursorBeforeId = data.nextBeforeId || messageCursorBeforeId;
    if (!older.length) return;

    for (let i = older.length - 1; i >= 0; i -= 1) {
      addMessage(older[i].role === "assistant" ? "bot" : "user", older[i].content, {
        prepend: true,
        attachments: older[i].attachments || [],
      });
    }

    const newHeight = chat.scrollHeight;
    chat.scrollTop = prevTop + (newHeight - prevHeight);

    const cached = loadCachedMessages(conversationId);
    const merged = [...(older || []), ...((cached && cached.messages) || [])];
    saveCachedMessages(conversationId, merged, messageCursorBeforeId);
  } catch {
    // ignore
  } finally {
    loadingOlder = false;
  }
}

async function selectConversation(id, { pushHistory = true } = {}) {
  conversationId = id;
  await refreshConversations();
  clearChat();
  const msgs = await loadMessages(id);
  for (const m of msgs) {
    addMessage(m.role === "assistant" ? "bot" : "user", m.content, { attachments: m.attachments || [] });
  }
  await loadConfig();
  scheduleNextNudge();
  input.focus();
  if (pushHistory) navigate("thread", id);
  else setScreen("chat");
}

function openDirectoryScreen() {
  if (!accessToken) return;
  setPresetMode("directory");
  recipientSearch.value = "";
  renderRecipientPresets("");
  setScreen("directory");
  recipientSearch.focus();
}

function renderRecipientPresets(query) {
  const q = (query || "").trim().toLowerCase();
  const directoryItems = directoryPresets.filter((p) => {
    if (!q) return true;
    return `${p.title} ${p.subtitle}`.toLowerCase().includes(q);
  });

  const userItems = userPresets
    .map(toDirectoryPresetFromUser)
    .filter((p) => {
      if (!q) return true;
      return `${p.title} ${p.subtitle}`.toLowerCase().includes(q);
    });

  const items = presetMode === "manage" ? userItems : [...userItems, ...directoryItems];

  recipientList.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "emptyState";
    empty.textContent = presetMode === "manage" ? "Aucun destinataire enregistré. Clique sur Nouveau pour en créer un." : "Aucun résultat.";
    recipientList.appendChild(empty);
    return;
  }

  for (const p of items) {
    const el = document.createElement("div");
    el.className = "recipientItem";

    const left = document.createElement("div");
    left.className = "recipientLeft";
    const av = document.createElement("div");
    av.className = "recipientAvatar";
    av.textContent = (p.title?.[0] || "?").toUpperCase();
    const txt = document.createElement("div");
    const name = document.createElement("div");
    name.className = "recipientName";
    name.textContent = p.title;
    const meta = document.createElement("div");
    meta.className = "recipientMeta";
    meta.textContent = p.subtitle;
    txt.appendChild(name);
    txt.appendChild(meta);
    left.appendChild(av);
    left.appendChild(txt);

    el.appendChild(left);
    el.addEventListener("click", async () => {
      try {
        if (presetMode === "manage") {
          const userId = p._userId;
          const source = userPresets.find((x) => x.id === userId);
          if (!source) return;
          activePresetId = source.id;
          fillPresetEditor(source);
          presetEditor.classList.remove("hidden");
          deletePresetBtn.disabled = false;
          return;
        }

        setScreen("chat");
        const created = await createConversation();
        await selectConversation(created.id);
        const saved = await saveConfig(p.config);
        applyConfigToUI(saved);
        setLocalConfig(saved);
        await renameConversation(created.id, p.title);
        await refreshConversations();
      } catch (e) {
        addMessage("bot", `Erreur: ${String(e?.message || e)}`);
      }
    });

    recipientList.appendChild(el);
  }
}

saveSettings.addEventListener("click", async () => {
  const cfg = readConfigFromUI();
  saveSettings.disabled = true;
  try {
    const saved = await saveConfig(cfg);
    const merged = { ...saved, randomMessagesEnabled: Boolean(cfg.randomMessagesEnabled) };
    applyConfigToUI(merged);
    setLocalConfig(merged);
    scheduleNextNudge();
    navigate("thread", conversationId, { replace: true });
  } catch (e) {
    addMessage("bot", `Erreur: ${String(e?.message || e)}`);
  } finally {
    saveSettings.disabled = false;
  }
});

loginBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;
  signupBtn.disabled = true;
  try {
    setAuthMessage("Connexion...");
    await signIn(emailEl.value.trim(), passwordEl.value);
    setAuthMessage("");
    const items = await refreshConversations();
    const prefs = loadPrefs();
    const theme = prefs.theme || getDefaultThemeMode();
    applyThemeMode(theme);
    navigate("messages", null, { replace: true });
    if (!items || items.length === 0) setTimeout(() => openDirectoryScreen(), 0);
  } catch (e) {
    setAuthMessage(String(e?.message || e));
  } finally {
    loginBtn.disabled = false;
    signupBtn.disabled = false;
  }
});

signupBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;
  signupBtn.disabled = true;
  try {
    setAuthMessage("Création du compte...");
    await signUp(emailEl.value.trim(), passwordEl.value);
    setAuthMessage("Compte créé. Tu peux te connecter.");
  } catch (e) {
    setAuthMessage(String(e?.message || e));
  } finally {
    loginBtn.disabled = false;
    signupBtn.disabled = false;
  }
});

newConvoBtn.addEventListener("click", async () => {
  newConvoBtn.disabled = true;
  try {
    openDirectoryScreen();
  } catch (e) {
    addMessage("bot", `Erreur: ${String(e?.message || e)}`);
  } finally {
    newConvoBtn.disabled = false;
  }
});

plusBtn.addEventListener("click", () => {
  if (!accessToken) return;
  if (docInput) docInput.click();
});

attachBtn.addEventListener("click", () => {
  if (!accessToken) return;
  if (fileInput) fileInput.click();
});

attachRemove.addEventListener("click", () => {
  resetPendingAttachment();
});

directoryBackBtn.addEventListener("click", async () => {
  if (!accessToken) return;
  navigate("messages", null);
  await refreshConversations().catch(() => {});
});

globalSettingsBtn.addEventListener("click", () => {
  if (!accessToken) return;
  const prefs = loadPrefs();
  const theme = prefs.theme || getDefaultThemeMode();
  applyThemeMode(theme);
  if (notificationsEnabledEl) notificationsEnabledEl.checked = Boolean(prefs.notificationsEnabled);
  navigate("globalSettings", null);
});

globalSettingsBackBtn.addEventListener("click", () => {
  if (!accessToken) return;
  navigate("messages", null);
});

saveUserSettingsBtn.addEventListener("click", async () => {
  try {
    saveUserSettingsBtn.disabled = true;
    setUserSettingsMessage("Enregistrement...");
    if (themeModeEl) {
      const prefs = loadPrefs();
      const theme = themeModeEl.value === "dark" ? "dark" : "light";
      savePrefs({ ...prefs, theme });
      applyThemeMode(theme);
    }
    if (notificationsEnabledEl) {
      const wants = Boolean(notificationsEnabledEl.checked);
      if (wants) {
        const ok = await ensureNotificationPermission();
        if (!ok) notificationsEnabledEl.checked = false;
      }
      const prefs = loadPrefs();
      savePrefs({ ...prefs, notificationsEnabled: Boolean(notificationsEnabledEl.checked) });
    }
    await saveUserSettings();
    setUserSettingsMessage("Enregistré.");
  } catch (e) {
    setUserSettingsMessage(String(e?.message || e));
    // revert UI to last known state
    applyUserSettingsToUI(cachedUserSettings);
  } finally {
    saveUserSettingsBtn.disabled = false;
  }
});

threadBackBtn.addEventListener("click", () => {
  if (!accessToken) return;
  navigate("messages", null);
});

threadSettingsBtn.addEventListener("click", () => {
  if (!accessToken || !conversationId) return;
  navigate("threadSettings", conversationId);
});

settingsBackBtn.addEventListener("click", () => {
  if (!accessToken || !conversationId) return;
  navigate("thread", conversationId, { replace: true });
});

recipientSearch.addEventListener("input", () => renderRecipientPresets(recipientSearch.value));

convosSearch.addEventListener("input", () => {
  convosQuery = convosSearch.value;
  renderConversations(filterConversations(lastConversations, convosQuery));
});

tabDirectory.addEventListener("click", async () => {
  setPresetMode("directory");
  await fetchUserPresets().catch(() => {});
  renderRecipientPresets(recipientSearch.value);
});

tabManage.addEventListener("click", async () => {
  setPresetMode("manage");
  await fetchUserPresets().catch(() => {});
  activePresetId = null;
  fillPresetEditor(null);
  deletePresetBtn.disabled = true;
  renderRecipientPresets(recipientSearch.value);
});

newPresetBtn.addEventListener("click", async () => {
  activePresetId = null;
  fillPresetEditor(null);
  deletePresetBtn.disabled = true;
  await fetchUserPresets().catch(() => {});
  renderRecipientPresets(recipientSearch.value);
});

savePresetBtn.addEventListener("click", async () => {
  try {
    savePresetBtn.disabled = true;
    const payload = readPresetEditor();
    if (activePresetId) {
      await apiJson("/api/presets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activePresetId, ...payload }),
      });
    } else {
      const created = await apiJson("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      activePresetId = created?.preset?.id || null;
    }
    await fetchUserPresets();
    renderRecipientPresets(recipientSearch.value);
    deletePresetBtn.disabled = !activePresetId;
  } catch (e) {
    addMessage("bot", `Erreur: ${String(e?.message || e)}`);
  } finally {
    savePresetBtn.disabled = false;
  }
});

deletePresetBtn.addEventListener("click", async () => {
  if (!activePresetId) return;
  try {
    deletePresetBtn.disabled = true;
    await apiJson(`/api/presets?id=${encodeURIComponent(activePresetId)}`, { method: "DELETE" });
    activePresetId = null;
    fillPresetEditor(null);
    await fetchUserPresets();
    renderRecipientPresets(recipientSearch.value);
  } catch (e) {
    addMessage("bot", `Erreur: ${String(e?.message || e)}`);
  } finally {
    deletePresetBtn.disabled = true;
  }
});

startPresetBtn.addEventListener("click", async () => {
  try {
    if (!accessToken) return;
    startPresetBtn.disabled = true;
    const payload = readPresetEditor();
    if (!payload?.title) throw new Error("Nom requis");
    const created = await createConversation();
    await selectConversation(created.id);
    const saved = await saveConfig(payload.config);
    applyConfigToUI(saved);
    setLocalConfig(saved);
    await renameConversation(created.id, payload.title);
    await refreshConversations();
  } catch (e) {
    addMessage("bot", `Erreur: ${String(e?.message || e)}`);
  } finally {
    startPresetBtn.disabled = false;
  }
});

convoMenuClose.addEventListener("click", closeConvoMenu);
convoMenu.addEventListener("click", (e) => {
  if (e.target === convoMenu) closeConvoMenu();
});

convoRename.addEventListener("click", async () => {
  try {
    if (!convoMenuId) return;
    const newTitle = window.prompt("Nouveau nom", "") ?? "";
    if (!newTitle.trim()) return;
    await renameConversation(convoMenuId, newTitle);
    await refreshConversations();
  } catch (e) {
    addMessage("bot", `Erreur: ${String(e?.message || e)}`);
  } finally {
    closeConvoMenu();
  }
});

convoDelete.addEventListener("click", async () => {
  try {
    if (!convoMenuId) return;
    const ok = window.confirm("Supprimer cette conversation ?");
    if (!ok) return;
    await apiJson(`/api/conversations?id=${encodeURIComponent(convoMenuId)}`, { method: "DELETE" });
    if (conversationId === convoMenuId) {
      conversationId = null;
      clearChat();
      applyConfigToUI(null);
    }
    await refreshConversations();
    navigate("messages", null, { replace: true });
  } catch (e) {
    addMessage("bot", `Erreur: ${String(e?.message || e)}`);
  } finally {
    closeConvoMenu();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = input.value.trim();
  if (!text && !pendingAttachment) return;

  input.value = "";
  autoGrowTextarea(input);

  sendBtn.disabled = true;
  setTyping(true);

  let lastUserRow = null;
  let lastPayloadText = "";
  let lastPayloadAttachment = null;

  try {
    const pendingExtractedText = pendingAttachment?.extractedText || "";
    const pendingFileName = pendingAttachment?.fileName || pendingAttachment?.file?.name || "";
    const pendingType = pendingAttachment?.type || "";

    const raw = (text || "").trim();
    const normalized = raw.toLowerCase();
    const imgGenPatterns = [
      /\bg[ée]n[ée]re(r)?\s+(une\s+)?image\b/i,
      /\bcr[ée]e(r)?\s+(une\s+)?image\b/i,
      /\bcree(r)?\s+(une\s+)?image\b/i,
      /\bfais\s+(moi\s+)?(une\s+)?image\b/i,
      /\bproduis\s+(une\s+)?image\b/i,
      /\bpeux-tu\s+(me\s+)?(g[ée]n[ée]rer|cr[ée]er|faire|produire)\s+(une\s+)?image\b/i,
      /\bj['’]?aimerais\s+(une\s+)?image\b/i,
      /\bg[ée]n[ée]ration\s+d['’]une\s+image\b/i,
      /\bgenerate\s+(an\s+)?image\b/i,
      /\bimage\s+similaire\b/i,
    ];
    const isImageGen = imgGenPatterns.some((p) => p.test(raw));

    const attachment = await uploadPendingAttachment();
    if (attachment?.localUrl) {
      lastUserRow = addMessage("user", text || " ", { attachments: [attachment] });
    } else if (attachment?.type === "document") {
      lastUserRow = addMessage("user", text || " ", { attachments: [attachment] });
    } else {
      lastUserRow = addMessage("user", text || " ");
    }
    playBeep("send");
    vibrate("send");
    resetPendingAttachment();

    if (isImageGen) {
      if (!conversationId) throw new Error("Conversation non sélectionnée");
      // Extract prompt after the last occurrence of the keyword "image" and optional connector.
      // Examples:
      // - "Peux-tu générer une image de un chat" -> "un chat"
      // - "Créer une image: un chat" -> "un chat"
      let prompt = raw;
      const m = raw.match(/\bimage\b[\s:,-]*(de|d['’]|of|for)?\s*(.*)$/i);
      if (m && m[2]) prompt = m[2].trim();
      if (!prompt) prompt = raw;

      const data = await apiJson("/api/image-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, prompt }),
      });

      const a = data?.attachment
        ? [
            {
              type: "image",
              storageBucket: data.attachment.storageBucket,
              storagePath: data.attachment.storagePath,
              mimeType: data.attachment.mimeType,
              sizeBytes: data.attachment.sizeBytes,
            },
          ]
        : [];

      addMessage("bot", data?.assistantMessage || "Voici une image générée.", { attachments: a });
    } else {
      let payloadText = text || "";
      if (!payloadText && pendingType === "document") {
        if (pendingExtractedText) {
          payloadText = `Analyse ce fichier: ${pendingFileName || "(sans nom)"}\n\nContenu:\n${pendingExtractedText}`;
        } else {
          payloadText = `Analyse ce fichier: ${pendingFileName || "(sans nom)"}.`;
        }
      }

      lastPayloadText = payloadText || "[image]";
      lastPayloadAttachment = attachment
        ? {
            type: attachment.type,
            storageBucket: attachment.storageBucket,
            storagePath: attachment.storagePath,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            width: attachment.width,
            height: attachment.height,
            fileName: attachment.fileName,
          }
        : null;

      const answer = await sendToServer(payloadText || "[image]", attachment
        ? {
            type: attachment.type,
            storageBucket: attachment.storageBucket,
            storagePath: attachment.storagePath,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            width: attachment.width,
            height: attachment.height,
            fileName: attachment.fileName,
          }
        : null);
      addMessage("bot", answer);
    }
    playBeep("receive");
    vibrate("receive");
  } catch (e) {
    addMessage("bot", `Échec d'envoi: ${String(e?.message || e)}`);
    if (lastUserRow && lastPayloadText) {
      attachRetryToRow(lastUserRow, { payloadText: lastPayloadText, attachment: lastPayloadAttachment });
    }
  } finally {
    setTyping(false);
    sendBtn.disabled = false;
    input.focus();
  }
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  if (!file.type || !file.type.startsWith("image/")) {
    resetPendingAttachment();
    addMessage("bot", "Format non supporté. Choisis une image (png/jpg/webp/gif). ");
    return;
  }

  resetPendingAttachment();
  const url = URL.createObjectURL(file);
  const dims = await getImageDimensionsFromUrl(url);
  pendingAttachment = { type: "image", file, fileName: file.name || null, previewUrl: url, width: dims.width, height: dims.height };
  if (attachLabel) attachLabel.textContent = "";
  if (attachThumb) attachThumb.classList.remove("hidden");
  if (attachThumb) attachThumb.src = url;
  if (attachPreview) attachPreview.classList.remove("hidden");
});

docInput?.addEventListener("change", async () => {
  const file = docInput.files && docInput.files[0];
  if (!file) return;

  resetPendingAttachment();

  let extractedText = "";
  const mime = String(file.type || "").toLowerCase();
  const name = String(file.name || "");
  const lower = name.toLowerCase();
  const isTextLike =
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("csv") ||
    mime.includes("markdown") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json");

  if (isTextLike) {
    try {
      extractedText = await file.text();
      extractedText = String(extractedText || "").slice(0, 12000);
    } catch {
      extractedText = "";
    }
  }

  pendingAttachment = {
    type: "document",
    file,
    fileName: file.name || null,
    extractedText,
  };

  if (attachLabel) attachLabel.textContent = file.name || "Fichier";
  if (attachThumb) attachThumb.classList.add("hidden");
  if (attachPreview) attachPreview.classList.remove("hidden");
});

addMessage("bot", "Salut. Dis-moi ce que tu veux faire.");
try {
  const prefs = loadPrefs();
  const theme = prefs.theme || getDefaultThemeMode();
  applyThemeMode(theme);
  if (notificationsEnabledEl) notificationsEnabledEl.checked = Boolean(prefs.notificationsEnabled);
} catch {
  // ignore
}
initSupabase()
  .then(() => {
    updateAuthUI();
    if (accessToken) {
      refreshConversations().catch(() => {});
      applyRoute(window.location.pathname, { fromPop: true });
      fetchUserPresets().catch(() => {});
    }
  })
  .catch((e) => {
    setAuthMessage(String(e?.message || e));
    updateAuthUI();
  });

function rehydrateOnResume() {
  if (!accessToken) return;
  refreshConversations().catch(() => {});
  if (conversationId) {
    selectConversation(conversationId, { pushHistory: false }).catch(() => {});
  } else {
    applyRoute(window.location.pathname, { fromPop: true });
  }
}

window.addEventListener("pageshow", () => {
  rehydrateOnResume();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") rehydrateOnResume();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    try {
      if (location.protocol !== "https:" && location.hostname !== "localhost") return;
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    } catch {
      // ignore
    }
  });
}
input.focus();
