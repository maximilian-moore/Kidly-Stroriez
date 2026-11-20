import { test } from "node:test";
import assert from "node:assert/strict";
import { MarkerSplitter, parsePartTail, parsePlan } from "../src/parse.js";

test("BL-001-T01 parsePlan reads a plan wrapped in extra text", () => {
  const plan = parsePlan('Sure!\n```json\n{"safe":true,"title":"T","theme":"Sharing","lesson":"Share","setting":"Meadow","echo":"Like today","choices":["a","b","c"]}\n```');
  assert.equal(plan.safe, true);
  assert.equal(plan.theme, "Sharing");
  assert.deepEqual(plan.choices, ["a", "b"]);
});

test("BL-001-T02 parsePlan passes through an unsafe verdict with a message", () => {
  const plan = parsePlan('{"safe":false,"message":"Please talk to someone you trust."}');
  assert.deepEqual(plan, { safe: false, message: "Please talk to someone you trust." });
});

test("BL-001-T03 parsePlan rejects a plan without two choice moments", () => {
  assert.throws(() => parsePlan('{"safe":true,"theme":"x","lesson":"y","choices":["one"]}'));
});

test("BL-001-T04 MarkerSplitter hides the marker even when split across chunks", () => {
  const s = new MarkerSplitter("@@@");
  let shown = "";
  for (const chunk of ["Once upon a ti", "me.\n@", "@", '@\n{"options":', '["a","b","c"]}']) shown += s.push(chunk);
  shown += s.flush();
  assert.equal(shown, "Once upon a time.\n");
  assert.deepEqual(parsePartTail(s.tail, false).options, ["a", "b", "c"]);
});

test("BL-001-T05 MarkerSplitter keeps lone @ signs that are not the marker", () => {
  const s = new MarkerSplitter("@@@");
  const shown = s.push("email me @") + s.push("home") + s.flush();
  assert.equal(shown, "email me @home");
});

test("BL-001-T06 parsePartTail reads the ending lesson and questions", () => {
  const tail = parsePartTail('\n{"lesson":"Share","questions":["q1","q2"]}', true);
  assert.deepEqual(tail, { lesson: "Share", questions: ["q1", "q2"] });
});
