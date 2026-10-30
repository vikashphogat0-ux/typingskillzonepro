import test from "node:test";
import assert from "node:assert/strict";
import { PASSAGE_SLOT_TARGETS, passageJobs } from "../lib/passageGenerationPlan.ts";

test("daily passage schedule requests 5 English and 5 Hindi in morning and afternoon", () => {
  assert.deepEqual(PASSAGE_SLOT_TARGETS.morning, { en: 5, hi: 5 });
  assert.deepEqual(PASSAGE_SLOT_TARGETS.afternoon, { en: 5, hi: 5 });
});

test("live slot requests two special passages in each language", () => {
  assert.deepEqual(PASSAGE_SLOT_TARGETS.live, { en: 2, hi: 2 });
  assert.deepEqual(passageJobs("live").map(x => x.language), ["en", "en", "hi", "hi"]);
});

test("retry planning requests only missing language passages", () => {
  assert.deepEqual(passageJobs("morning", { en: 5, hi: 3 }), [
    { language: "hi", index: 3 }, { language: "hi", index: 4 },
  ]);
});
