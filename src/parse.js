// Helpers for turning model output into data the app can use.

export const MARKER = "@@@";

// Pull the first {...} JSON object out of a model reply. Tolerates text or code
// fences around it. Throws if there is no parseable object.
export function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in reply");
  return JSON.parse(text.slice(start, end + 1));
}

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Normalise a plan reply into the exact shape the client expects.
export function parsePlan(text) {
  const raw = extractJson(text);
  if (raw.safe === false) {
    return {
      safe: false,
      message:
        str(raw.message, 600) ||
        "This sounds like something to talk through with someone you trust, rather than a story.",
    };
  }
  const choices = Array.isArray(raw.choices) ? raw.choices.map((c) => str(c, 200)).filter(Boolean) : [];
  const plan = {
    safe: true,
    title: str(raw.title, 80),
    theme: str(raw.theme, 200),
    lesson: str(raw.lesson, 300),
    setting: str(raw.setting, 200),
    echo: str(raw.echo, 400),
    choices: choices.slice(0, 2),
  };
  if (!plan.theme || !plan.lesson || plan.choices.length < 2) throw new Error("Plan is incomplete");
  return plan;
}

// Normalise the JSON that follows the marker at the end of a story part.
export function parsePartTail(text, isLast) {
  let raw = {};
  try {
    raw = extractJson(text);
  } catch {
    raw = {};
  }
  if (isLast) {
    const questions = Array.isArray(raw.questions) ? raw.questions.map((q) => str(q, 200)).filter(Boolean) : [];
    return { lesson: str(raw.lesson, 300), questions: questions.slice(0, 3) };
  }
  const options = Array.isArray(raw.options) ? raw.options.map((o) => str(o, 120)).filter(Boolean) : [];
  return { options: options.slice(0, 3) };
}

// Splits a stream of text chunks where the story prose ends. The model is asked to
// write MARKER before the JSON, but if it forgets, a code fence or the JSON itself
// also ends the prose, so the child never sees raw JSON. Prose is released as soon
// as it cannot be the start of an end marker; everything after it is kept back.
const END_MARKERS = [
  { text: MARKER, keep: false },
  { text: "```", keep: false },
  { text: '{"options"', keep: true },
  { text: '{"lesson"', keep: true },
];

export class MarkerSplitter {
  constructor(markers = END_MARKERS) {
    this.markers = markers;
    this.buffer = "";
    this.found = false;
    this.tail = "";
  }

  // Returns the story text that is safe to show now.
  push(chunk) {
    if (this.found) {
      this.tail += chunk;
      return "";
    }
    this.buffer += chunk;
    let hit = null;
    for (const m of this.markers) {
      const idx = this.buffer.indexOf(m.text);
      if (idx !== -1 && (hit === null || idx < hit.idx)) hit = { idx, m };
    }
    if (hit) {
      this.found = true;
      const out = this.buffer.slice(0, hit.idx);
      this.tail = this.buffer.slice(hit.m.keep ? hit.idx : hit.idx + hit.m.text.length);
      this.buffer = "";
      return out;
    }
    // Hold back the longest ending that could still grow into a marker.
    let keep = 0;
    for (const m of this.markers) {
      for (let k = Math.min(m.text.length - 1, this.buffer.length); k > keep; k--) {
        if (m.text.startsWith(this.buffer.slice(-k))) {
          keep = k;
          break;
        }
      }
    }
    const out = this.buffer.slice(0, this.buffer.length - keep);
    this.buffer = this.buffer.slice(this.buffer.length - keep);
    return out;
  }

  // Call at the end of the stream: returns any held-back story text.
  flush() {
    const out = this.found ? "" : this.buffer;
    this.buffer = "";
    return out;
  }
}
