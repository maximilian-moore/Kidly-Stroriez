import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { HEROES, SYSTEM_PROMPT, planPrompt, partPrompt } from "./prompts.js";
import { MarkerSplitter, parsePartTail, parsePlan } from "./parse.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "..", "public");

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const EFFORT = process.env.CLAUDE_EFFORT || "low";

// Shared request settings. Low effort keeps the first words quick (NFR-01).
// Server-side fallback re-runs a safety-declined request on another model.
const baseParams = () => ({
  model: MODEL,
  max_tokens: 16000,
  output_config: { effort: EFFORT },
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
  system: SYSTEM_PROMPT,
});

const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Validate the parent's input. Returns { value } or { error }.
function readNotes(body) {
  const age = Number(body?.age);
  const hero = text(body?.hero, 20);
  const happened = text(body?.happened, 600);
  if (!Number.isInteger(age) || age < 3 || age > 9) return { error: "Age must be between 3 and 9." };
  if (!HEROES[hero]) return { error: "Please pick a hero." };
  if (!happened) return { error: "Please say what happened today." };
  return {
    value: { age, hero, happened, felt: text(body?.felt, 400), did: text(body?.did, 400) },
  };
}

function readPlan(raw) {
  if (!raw || typeof raw !== "object") return null;
  const choices = Array.isArray(raw.choices) ? raw.choices.map((c) => text(c, 200)).filter(Boolean) : [];
  if (choices.length < 2) return null;
  return {
    title: text(raw.title, 80),
    theme: text(raw.theme, 200),
    lesson: text(raw.lesson, 300),
    setting: text(raw.setting, 200),
    echo: text(raw.echo, 400),
    choices: choices.slice(0, 2),
  };
}

const replyText = (message) =>
  message.content.filter((b) => b.type === "text").map((b) => b.text).join("");

export function createApp({ client } = {}) {
  const anthropic = client !== undefined ? client : process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use(express.static(publicDir));

  app.get("/api/config", (_req, res) => res.json({ live: Boolean(anthropic) }));

  // Step 3/4: propose (or revise) the story plan. Nothing is written yet (FR-13).
  app.post("/api/plan", async (req, res) => {
    const { value, error } = readNotes(req.body);
    if (error) return res.status(400).json({ error });
    if (!anthropic) return res.status(503).json({ error: "offline" });

    const previousPlan = readPlan(req.body.previousPlan);
    const changeRequest = text(req.body.changeRequest, 400);
    try {
      const message = await anthropic.beta.messages.create({
        ...baseParams(),
        messages: [{ role: "user", content: planPrompt({ ...value, previousPlan, changeRequest }) }],
      });
      if (message.stop_reason === "refusal") {
        return res.json({
          safe: false,
          message: "We could not make a story from these notes. Try describing the day a little differently.",
        });
      }
      return res.json(parsePlan(replyText(message)));
    } catch (err) {
      console.error("plan failed:", err?.status ?? "", err?.message);
      return res.status(502).json({ error: "The story helper is not available right now." });
    }
  });

  // Step 5: stream one part of the story as NDJSON lines:
  // {"type":"text","text":"..."} ... then {"type":"options",...} or {"type":"end",...}
  app.post("/api/story", async (req, res) => {
    const { value, error } = readNotes(req.body);
    if (error) return res.status(400).json({ error });
    const plan = readPlan(req.body.plan);
    // SR-05: the child only sees content the parent approved at plan level.
    if (!plan || req.body.approved !== true) return res.status(400).json({ error: "The plan must be approved first." });
    const partIndex = Number(req.body.partIndex);
    if (![0, 1, 2].includes(partIndex)) return res.status(400).json({ error: "Bad part." });
    const history = (Array.isArray(req.body.history) ? req.body.history : [])
      .slice(0, partIndex)
      .map((h) => ({ text: text(h?.text, 1500), choice: text(h?.choice, 120) }));
    if (history.length !== partIndex) return res.status(400).json({ error: "Story history is incomplete." });
    if (!anthropic) return res.status(503).json({ error: "offline" });

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const send = (obj) => res.write(JSON.stringify(obj) + "\n");

    const isLast = partIndex === 2;
    const splitter = new MarkerSplitter();
    let closed = false;
    res.on("close", () => {
      closed = true;
    });

    try {
      const stream = anthropic.beta.messages.stream({
        ...baseParams(),
        messages: [{ role: "user", content: partPrompt({ ...value, plan, history, partIndex }) }],
      });
      for await (const event of stream) {
        if (closed) {
          stream.abort?.();
          return;
        }
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const out = splitter.push(event.delta.text);
          if (out) send({ type: "text", text: out });
        }
      }
      const final = await stream.finalMessage();
      const rest = splitter.flush();
      if (rest) send({ type: "text", text: rest });
      if (final.stop_reason === "refusal") {
        send({ type: "error", error: "refused" });
        return res.end();
      }
      const tail = parsePartTail(splitter.tail, isLast);
      if (isLast) send({ type: "end", ...tail });
      else if (tail.options.length >= 2) send({ type: "options", options: tail.options });
      else send({ type: "error", error: "no-options" });
    } catch (err) {
      console.error("story failed:", err?.status ?? "", err?.message);
      if (!closed) send({ type: "error", error: "unavailable" });
    }
    if (!closed) res.end();
  });

  return app;
}
