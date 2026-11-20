import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp, signPlan } from "../src/app.js";

const notes = { age: 5, hero: "pip", happened: "Fought over a toy car", felt: "Angry", did: "Grabbed it" };
const plan = { title: "T", theme: "Sharing", lesson: "Share", setting: "Meadow", echo: "Like today", choices: ["a", "b"] };
const sig = signPlan(plan, notes);

function fakeClient({ reply = "", content, chunks = [], events, stopReason = "end_turn", fail = false } = {}) {
  const calls = [];
  return {
    calls,
    beta: {
      messages: {
        async create(params) {
          calls.push(params);
          if (fail) throw new Error("boom");
          return { stop_reason: stopReason, content: content || [{ type: "text", text: reply }] };
        },
        stream(params) {
          calls.push(params);
          return {
            async *[Symbol.asyncIterator]() {
              if (fail) throw new Error("boom");
              if (events) for (const e of events) yield e;
              for (const t of chunks) yield { type: "content_block_delta", delta: { type: "text_delta", text: t } };
            },
            async finalMessage() {
              return { stop_reason: stopReason, content: [] };
            },
          };
        },
      },
    },
  };
}

async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
  }
}

const post = (base, path, body) =>
  fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("BL-001-T07 /api/plan returns a parsed plan and never sends the child's name", async () => {
  const client = fakeClient({ reply: JSON.stringify({ safe: true, ...plan }) });
  await withServer(createApp({ client }), async (base) => {
    const res = await post(base, "/api/plan", { ...notes, name: "Mia" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.theme, "Sharing");
    assert.equal(body.sig, signPlan(plan, notes));
    assert.ok(!JSON.stringify(client.calls[0]).includes("Mia"));
  });
});

test("BL-001-T08 /api/plan rejects missing notes and unknown heroes", async () => {
  await withServer(createApp({ client: fakeClient() }), async (base) => {
    assert.equal((await post(base, "/api/plan", { ...notes, happened: "" })).status, 400);
    assert.equal((await post(base, "/api/plan", { ...notes, hero: "dragon" })).status, 400);
    assert.equal((await post(base, "/api/plan", { ...notes, age: 12 })).status, 400);
  });
});

test("BL-001-T09 without an AI key the API reports offline so the app uses the built-in story", async () => {
  await withServer(createApp({ client: null }), async (base) => {
    assert.deepEqual(await (await fetch(base + "/api/config")).json(), { live: false });
    assert.equal((await post(base, "/api/plan", notes)).status, 503);
  });
});

test("BL-001-T10 /api/plan returns 502 when the AI call fails", async () => {
  await withServer(createApp({ client: fakeClient({ fail: true }) }), async (base) => {
    assert.equal((await post(base, "/api/plan", notes)).status, 502);
  });
});

test("BL-001-T11 /api/story refuses to write before the plan is approved", async () => {
  const client = fakeClient();
  await withServer(createApp({ client }), async (base) => {
    const res = await post(base, "/api/story", { ...notes, plan, partIndex: 0, history: [] });
    assert.equal(res.status, 400);
    assert.equal(client.calls.length, 0);
  });
});

test("BL-001-T12 /api/story streams text and options without the marker", async () => {
  const client = fakeClient({ chunks: ["Pip found ", "a kite.\n@@", '@\n{"options":["Share","Grab","Shout"]}'] });
  await withServer(createApp({ client }), async (base) => {
    const res = await post(base, "/api/story", { ...notes, plan, approved: true, sig, partIndex: 0, history: [] });
    assert.equal(res.status, 200);
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
    const text = lines.filter((l) => l.type === "text").map((l) => l.text).join("");
    assert.equal(text.trim(), "Pip found a kite.");
    assert.deepEqual(lines.at(-1), { type: "options", options: ["Share", "Grab", "Shout"] });
  });
});

test("BL-001-T13 /api/story sends the ending lesson and questions on the last part", async () => {
  const client = fakeClient({ chunks: ["They slept.\n@@@\n", '{"lesson":"Share","questions":["q1","q2"]}'] });
  const history = [{ text: "p1", choice: "c1" }, { text: "p2", choice: "c2" }];
  await withServer(createApp({ client }), async (base) => {
    const res = await post(base, "/api/story", { ...notes, plan, approved: true, sig, partIndex: 2, history });
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(lines.at(-1), { type: "end", lesson: "Share", questions: ["q1", "q2"] });
  });
});

test("BL-001-T14 /api/story reports an error line when the AI call fails mid-way", async () => {
  await withServer(createApp({ client: fakeClient({ fail: true }) }), async (base) => {
    const res = await post(base, "/api/story", { ...notes, plan, approved: true, sig, partIndex: 0, history: [] });
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(lines.at(-1).type, "error");
  });
});

test("BL-001-T16 /api/story rejects a plan the server did not sign for these notes", async () => {
  const client = fakeClient({ chunks: ["x"] });
  await withServer(createApp({ client }), async (base) => {
    const forged = { ...plan, theme: "Something else" };
    const r1 = await post(base, "/api/story", { ...notes, plan: forged, sig, approved: true, partIndex: 0, history: [] });
    const r2 = await post(base, "/api/story", { ...notes, happened: "changed", plan, sig, approved: true, partIndex: 0, history: [] });
    assert.equal(r1.status, 400);
    assert.equal(r2.status, 400);
    assert.equal(client.calls.length, 0);
  });
});

test("BL-001-T17 /api/story restarts the part when a safety fallback switches models", async () => {
  const delta = (t) => ({ type: "content_block_delta", delta: { type: "text_delta", text: t } });
  const events = [delta("Declined start"), { type: "content_block_start", content_block: { type: "fallback" } }];
  const client = fakeClient({ events, chunks: ["Fresh start.\n@@@\n", '{"options":["a","b","c"]}'] });
  await withServer(createApp({ client }), async (base) => {
    const res = await post(base, "/api/story", { ...notes, plan, sig, approved: true, partIndex: 0, history: [] });
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
    const resetAt = lines.findIndex((l) => l.type === "reset");
    assert.ok(resetAt > 0);
    const after = lines.slice(resetAt).filter((l) => l.type === "text").map((l) => l.text).join("");
    assert.equal(after.trim(), "Fresh start.");
  });
});

test("BL-001-T18 /api/plan uses only the text after a safety fallback switch", async () => {
  const content = [
    { type: "text", text: '{"safe":true,"theme":"half' },
    { type: "fallback", from: { model: "a" }, to: { model: "b" } },
    { type: "text", text: JSON.stringify({ safe: true, ...plan }) },
  ];
  await withServer(createApp({ client: fakeClient({ content }) }), async (base) => {
    const res = await post(base, "/api/plan", notes);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).theme, "Sharing");
  });
});

test("BL-001-T19 too many requests from one visitor get a 429", async () => {
  const client = fakeClient({ reply: JSON.stringify({ safe: true, ...plan }) });
  await withServer(createApp({ client, limit: { windowMs: 60000, max: 2 } }), async (base) => {
    assert.equal((await post(base, "/api/plan", notes)).status, 200);
    assert.equal((await post(base, "/api/plan", notes)).status, 200);
    assert.equal((await post(base, "/api/plan", notes)).status, 429);
  });
});
