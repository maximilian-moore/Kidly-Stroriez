import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("BL-001-T15 the offline story has every branch the app needs", () => {
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(new URL("../public/fallback.js", import.meta.url), "utf8"), ctx);
  const F = ctx.window.FALLBACK;
  assert.equal(F.plan.choices.length, 2);
  assert.equal(F.parts[0].options.length, 3);
  assert.equal(F.middles.length, F.parts[0].options.length);
  assert.equal(F.endings.length, F.secondOptions.length);
  assert.ok(F.questions.length >= 2 && F.lesson);
});
