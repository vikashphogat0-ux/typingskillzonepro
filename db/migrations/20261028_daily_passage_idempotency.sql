-- Retry-safe uniqueness for scheduled batches. Existing/manual passages have NULL generation metadata and are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS passages_generated_slot_title_uidx
  ON passages (generation_date, generation_slot, language, title)
  WHERE generation_date IS NOT NULL AND generation_slot IS NOT NULL;
