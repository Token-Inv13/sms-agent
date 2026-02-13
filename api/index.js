import billingCheckout from "./billing/checkout.js";
import billingPortal from "./billing/portal.js";
import billingStatus from "./billing/status.js";
import billingWebhook from "./billing/webhook.js";

import chat from "./chat.js";
import config from "./config.js";
import conversations from "./conversations.js";
import imageGen from "./image-gen.js";
import messages from "./messages.js";
import models from "./models.js";
import nudge from "./nudge.js";
import presets from "./presets.js";
import publicEnv from "./public-env.js";
import userSettings from "./user-settings.js";
import xaiImageModels from "./xai-image-models.js";

import smartNoteLink from "./smartnote/link.js";
import smartNoteNote from "./smartnote/note.js";
import smartNoteReminder from "./smartnote/reminder.js";
import smartNoteStatus from "./smartnote/status.js";
import smartNoteTask from "./smartnote/task.js";
import smartNoteUnlink from "./smartnote/unlink.js";

function buildQueryObject(urlObj) {
  const out = {};
  for (const [key, value] of urlObj.searchParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      const prev = out[key];
      if (Array.isArray(prev)) prev.push(value);
      else out[key] = [prev, value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

const ROUTES = {
  "billing/checkout": billingCheckout,
  "billing/portal": billingPortal,
  "billing/status": billingStatus,
  "billing/webhook": billingWebhook,

  chat,
  config,
  conversations,
  "image-gen": imageGen,
  messages,
  models,
  nudge,
  presets,
  "public-env": publicEnv,
  "user-settings": userSettings,
  "xai-image-models": xaiImageModels,

  "smartnote/status": smartNoteStatus,
  "smartnote/link": smartNoteLink,
  "smartnote/unlink": smartNoteUnlink,
  "smartnote/note": smartNoteNote,
  "smartnote/task": smartNoteTask,
  "smartnote/reminder": smartNoteReminder,
};

export default async function handler(req, res) {
  try {
    const fullUrl = new URL(req.url, "http://localhost");
    const pathname = fullUrl.pathname || "/";

    const rel = pathname.startsWith("/api/") ? pathname.slice("/api/".length) : pathname.replace(/^\//, "");
    const key = rel.replace(/\.js$/, "").replace(/^\/+|\/+$/g, "");

    const route = ROUTES[key];
    if (!route) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    req.query = buildQueryObject(fullUrl);
    return await route(req, res);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: String(e?.message || e) }));
  }
}
