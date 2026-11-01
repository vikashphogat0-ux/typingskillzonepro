import test from "node:test";
import assert from "node:assert/strict";
import { formatRkcPassage, getRkcPassageLayout } from "../lib/rkc-passage-format.ts";

test("BSF and CRPF simulators use continuous passage layout", () => {
  assert.equal(getRkcPassageLayout("bsf-hcm-en"), "continuous");
  assert.equal(getRkcPassageLayout("crpf-hcm-hi"), "continuous");
});

test("Delhi Police HCM preserves paragraph and tab layout", () => {
  assert.equal(getRkcPassageLayout("dp-hcm-en"), "paragraph-tab");
  assert.equal(getRkcPassageLayout("delhi-police-hcm-hi"), "paragraph-tab");
});

test("other exam profiles preserve the source passage layout", () => {
  assert.equal(getRkcPassageLayout("rrb-ntpc-en"), "source-preserved");
  assert.equal(getRkcPassageLayout("ssc-chsl-hi"), "source-preserved");
});

test("continuous layout collapses whitespace without changing visible word order", () => {
  assert.equal(
    formatRkcPassage("  First   line\n\nSecond\tline  ", "continuous"),
    "First line Second line",
  );
});

test("paragraph layout normalizes line endings and trims trailing line whitespace", () => {
  assert.equal(
    formatRkcPassage("  First line  \r\nSecond line\t\r\n\r\nThird line  ", "paragraph-tab"),
    "First line\nSecond line\n\nThird line",
  );
});

test("source-preserved layout keeps internal tabs and paragraph boundaries", () => {
  assert.equal(
    formatRkcPassage("Column one\tColumn two\n\nNext paragraph", "source-preserved"),
    "Column one\tColumn two\n\nNext paragraph",
  );
});
