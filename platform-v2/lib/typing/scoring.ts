export type ScoringPolicy = {
  errorUnit: "character" | "word";
  penaltyPerError: number;
  backspaceAllowed: boolean;
};

export type ScoreInput = {
  correctCharacters: number;
  typedCharacters: number;
  elapsedSeconds: number;
  errors: number;
  policy: ScoringPolicy;
};

export type TypingScore = {
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  errors: number;
};

/** Pure calculation helper. The caller must supply verified exam-specific policy. */
export function calculateTypingScore(input: ScoreInput): TypingScore {
  const elapsedMinutes = Math.max(input.elapsedSeconds, 1) / 60;
  const grossWpm = Math.max(0, input.typedCharacters) / 5 / elapsedMinutes;
  const rawNetWpm = grossWpm - Math.max(0, input.errors) * input.policy.penaltyPerError / elapsedMinutes;
  const accuracy = input.typedCharacters <= 0 ? 0 : Math.max(0, Math.min(100, input.correctCharacters / input.typedCharacters * 100));
  return {
    grossWpm: Number(grossWpm.toFixed(2)),
    netWpm: Number(Math.max(0, rawNetWpm).toFixed(2)),
    accuracy: Number(accuracy.toFixed(2)),
    errors: Math.max(0, input.errors),
  };
}
