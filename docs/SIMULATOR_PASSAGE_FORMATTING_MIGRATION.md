# Simulator passage formatting migration readiness

The simulator passage-formatting feature requires these columns on `exam_templates`:

- `passage_layout`
- `font_size_pt`
- `passage_font_family`
- `passage_alignment`
- `passage_line_spacing`
- `passage_paragraph_spacing`
- `print_page_size`

## Read-only preflight

Load the intended database URL from the existing local environment and run:

```powershell
npm run db:check-passage-formatting
```

The check reads only `information_schema.columns`. It does not create, alter, delete, or update any database object or row. A non-zero exit means one or more required columns are absent.

## If columns are missing

Review `db/migrations/20261101_simulator_passage_formatting_controls.sql`, confirm the target database and backup/restore plan under your normal production procedure, then apply that migration using the existing Neon SQL/migration workflow. It is additive and uses `ADD COLUMN IF NOT EXISTS`; it does not reset or replace the database.

Re-run the read-only preflight after applying it. Do not deploy the formatting feature to production until the check reports ready. Do not paste database credentials into source control or chat.
