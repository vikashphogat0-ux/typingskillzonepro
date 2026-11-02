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
    console.error("DATABASE_URL is not set. Load your existing local environment before running this read-only check.");
    process.exitCode = 1;
    return;
  }

  // Read-only metadata and count queries. This script never runs migrations or changes rows/schema.
  const db = neon(databaseUrl);
  const columns = await db`SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'exam_templates'`;
  if (!columns.length) {
    console.error("The exam_templates table was not found in the configured database/schema.");
    process.exitCode = 1;
    return;
  }

  const existing = new Set(columns.map((row) => String(row.column_name)));
  const missing = requiredColumns.filter((column) => !existing.has(column));
  if (missing.length) {
    console.error("Simulator passage formatting schema is NOT ready.");
    console.error("Missing exam_templates columns: " + missing.join(", "));
    console.error("Review and apply db/migrations/20261101_simulator_passage_formatting_controls.sql through your approved Neon migration process.");
  } else {
    console.log("Simulator passage formatting columns: READY");
  }

  const rows = await db`SELECT language, is_active, COALESCE(passage_layout, 'continuous') AS passage_layout,
      display_mode, count(*)::int AS exam_count
    FROM exam_templates
    GROUP BY language, is_active, passage_layout, display_mode
    ORDER BY language, passage_layout, display_mode, is_active DESC`;
  const totals = await db`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE is_active)::int AS active,
      count(*) FILTER (WHERE language = 'en' AND is_active)::int AS active_english,
      count(*) FILTER (WHERE language = 'hi' AND is_active)::int AS active_hindi
    FROM exam_templates`;
  const total = totals[0] ?? { total: 0, active: 0, active_english: 0, active_hindi: 0 };

  console.log("Exam catalogue totals:", JSON.stringify(total));
  if (Number(total.total) === 0) {
    console.error("No exam templates exist. The exam-format dropdown cannot populate until the approved exam catalogue is seeded.");
    console.error("Review db/migrations/20261101_complete_exam_catalogue.sql before applying it to the intended database.");
    process.exitCode = 1;
  } else {
    console.log("Exam-format groups found:");
    for (const row of rows) console.log(JSON.stringify(row));
  }

  const passageTables = await db`SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name IN ('passage_sources', 'passage_versions', 'passage_distributions')`;
  const found = new Set(passageTables.map((row) => String(row.table_name)));
  const missingPassageTables = ["passage_sources", "passage_versions", "passage_distributions"].filter((name) => !found.has(name));
  if (missingPassageTables.length) {
    console.error("Passage repository tables missing: " + missingPassageTables.join(", "));
    console.error("Review db/migrations/20261101_passage_intelligence_system.sql before applying it.");
    process.exitCode = 1;
  } else {
    console.log("Passage repository tables: READY");
  }

  if (missing.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Read-only database readiness check failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
