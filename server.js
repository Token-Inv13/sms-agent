import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const apiKey = process.env.XAI_API_KEY;
if (!apiKey) throw new Error("XAI_API_KEY manquant dans .env");
const baseUrl = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

const app = express();
app.use(express.json({ limit: "256kb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const threads = new Map();
const configs = new Map();

const threadsFile = process.env.THREADS_FILE ? path.resolve(process.env.THREADS_FILE) : null;

function loadThreadsFromFile() {
  if (!threadsFile) return;
  if (!fs.existsSync(threadsFile)) return;
  const raw = fs.readFileSync(threadsFile, "utf8");
  if (!raw.trim()) return;
  const data = JSON.parse(raw);
  if (!data || typeof data !== "object") return;
  for (const [id, msgs] of Object.entries(data)) {
    if (Array.isArray(msgs)) threads.set(id, msgs);
  }
}

function saveThreadsToFile() {
  if (!threadsFile) return;
  const obj = Object.fromEntries(threads.entries());
  fs.writeFileSync(threadsFile, JSON.stringify(obj, null, 2), "utf8");
}

loadThreadsFromFile();

function getThread(id) {
  if (!threads.has(id)) threads.set(id, []);
  return threads.get(id);
}

function getConfig(id) {
  if (!configs.has(id)) {
    configs.set(id, {
      contactName: "Assistant",
      persona: "friend",
      gender: "neutral",
      context: "",
    });
  }
  return configs.get(id);
}

function sanitizeConfig(input) {
  const cfg = {
    contactName: "Assistant",
    persona: "friend",
    gender: "neutral",
    context: "",
  };

  if (input && typeof input === "object") {
    if (typeof input.contactName === "string") cfg.contactName = input.contactName.slice(0, 60).trim() || cfg.contactName;
    if (typeof input.persona === "string") cfg.persona = input.persona;
    if (typeof input.gender === "string") cfg.gender = input.gender;
    if (typeof input.context === "string") cfg.context = input.context.slice(0, 2000).trim();
  }

  const allowedPersonas = new Set(["friend", "employer", "partner", "customer_support", "custom"]);
  if (!allowedPersonas.has(cfg.persona)) cfg.persona = "friend";

  const allowedGenders = new Set(["neutral", "female", "male"]);
  if (!allowedGenders.has(cfg.gender)) cfg.gender = "neutral";

  return cfg;
}

function buildSystemPrompt(cfg) {
  const base =
    "Tu es un agent conversationnel type SMS. Réponses courtes, claires, naturelles. Pose des questions si nécessaire. Pas de blabla.";

  const personaTextByKey = {
    friend: "Tu joues le rôle d'un(e) ami(e) proche, chaleureux(se), naturel(le).",
    employer: "Tu joues le rôle d'un employeur/recruteur: professionnel, direct, bienveillant.",
    partner: "Tu joues le rôle d'un(e) partenaire: attentionné(e), complice, naturel(le).",
    customer_support: "Tu joues le rôle d'un support client: poli, efficace, orienté solution.",
    custom: "",
  };

  const genderTextByKey = {
    neutral: "",
    female: "Tu t'exprimes comme une femme.",
    male: "Tu t'exprimes comme un homme.",
  };

  const parts = [base];
  const p = personaTextByKey[cfg.persona];
  if (p) parts.push(p);
  const g = genderTextByKey[cfg.gender];
  if (g) parts.push(g);
  if (cfg.contactName) parts.push(`Ton nom affiché est: ${cfg.contactName}.`);
  if (cfg.context) parts.push(`Contexte/scénario: ${cfg.context}`);

  return parts.join("\n");
}

async function listGrokModels() {
  const resp = await fetch(`${baseUrl}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`Grok API error: ${resp.status} ${errTxt}`);
  }

  return await resp.json();
}

async function callGrok(messages) {
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.XAI_MODEL || "grok-2-latest",
      messages,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const errTxt = await resp.text();
    let hint = "";
    try {
      const parsed = JSON.parse(errTxt);
      const code = parsed?.code;
      const message = parsed?.error;
      if (resp.status === 404 && (code === "Some requested entity was not found" || /model/i.test(String(message)))) {
        hint = " (modèle introuvable/inaccessible: vérifie XAI_MODEL ou appelle /api/models pour lister les modèles dispo)";
      }
    } catch {
      // ignore
    }
    throw new Error(`Grok API error: ${resp.status} ${errTxt}${hint}`);
  }

  const data = await resp.json();

  const text = data?.choices?.[0]?.message?.content;
  return (typeof text === "string" ? text : "").trim() || "(réponse vide)";
}

app.get("/api/models", async (req, res) => {
  try {
    const data = await listGrokModels();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get("/api/config", (req, res) => {
  const id = (req.query.threadId && String(req.query.threadId)) || "default";
  res.json({ threadId: id, config: getConfig(id) });
});

app.post("/api/config", (req, res) => {
  const { threadId, config } = req.body || {};
  const id = (threadId && String(threadId)) || "default";
  const sanitized = sanitizeConfig(config);
  configs.set(id, sanitized);
  res.json({ threadId: id, config: sanitized });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { threadId, userMessage } = req.body || {};
    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ error: "userMessage requis (string)" });
    }

    const id = (threadId && String(threadId)) || "default";
    const thread = getThread(id);

    const cfg = getConfig(id);

    const system = {
      role: "system",
      content: buildSystemPrompt(cfg),
    };

    const history = thread.slice(-20);

    const messages = [system, ...history, { role: "user", content: userMessage }];

    const assistantText = await callGrok(messages);

    thread.push({ role: "user", content: userMessage });
    thread.push({ role: "assistant", content: assistantText });

    saveThreadsToFile();

    res.json({ threadId: id, assistantMessage: assistantText });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`SMS agent sur http://localhost:${port}`));
