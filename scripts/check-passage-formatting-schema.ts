import { neon } from "@neondatabase/serverless";

const requiredColumns = [
  "passage_layout",
  "font_size_pt",
  "passage_font_family",
  "passage_alignment",
  "passage_line_spacing",
  "passage_paragraph_spacing",
  "print_page_size",
] as const;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Load your existing local environment before running this check.");
    process.exitCode = 1;
    return;
  }

  // Read-only metadata query. This script never runs migrations or changes rows/schema.
  const db = neon(databaseUrl);
  const rows = await db`SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'exam_templates'`;
  const existing = new Set(rows.map((row) => String(row.column_name)));
  const missing = requiredColumns.filter((column) => !existing.has(column));

  if (missing.length) {
    console.error("Simulator passage formatting schema is NOT ready.");
    console.error("Missing exam_templates columns: " + missing.join(", "));
    console.error("Review and apply db/migrations/20261101_simulator_passage_formatting_controls.sql through your approved Neon migration process.");
    process.exitCode = 1;
    return;
  }

  console.log("Simulator passage formatting schema is ready.");
  console.log("Verified columns: " + requiredColumns.join(", "));
}

main().catch((error) => {
  console.error("Schema readiness check failed:", error instanceof Error ? error.message : "Unknown database error");
  process.exitCode = 1;
});
