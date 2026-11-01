export type EnterKeyPolicy = "newline" | "blocked";
export type TabKeyPolicy = "insert" | "blocked";

/** Check inserted control characters after the edit has passed the backspace policy. */
export function isExamInputAllowed(
  previous: string,
  next: string,
  enterPolicy: EnterKeyPolicy,
  tabPolicy: TabKeyPolicy,
): boolean {
  const before = Array.from(previous);
  const after = Array.from(next);
  let common = 0;
  while (common < before.length && common < after.length && before[common] === after[common]) common++;
  const inserted = after.slice(common).join("");
  if (enterPolicy === "blocked" && inserted.includes("\n")) return false;
  if (tabPolicy === "blocked" && inserted.includes("\t")) return false;
  return true;
}
