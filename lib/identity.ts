/**
 * Identity linking — decides how a signed-in person maps to a row in our users table.
 * Pure, so it is easy to test. Kept even after removing better-auth: it's the single
 * decision rule that prevents one person from claiming two accounts or stealing one.
 */
export interface UserRow { id: string; auth_id: string | null }
export type LinkDecision =
  | { action: "use"; id: string }
  | { action: "link"; id: string }
  | { action: "create" }
  | { action: "block" };

/**
 * - Known sign-in id: use that user.
 * - Same email, row never claimed, email VERIFIED: link it (this is how a pre-made admin row is claimed).
 * - Same email but unverified, or already owned by another sign-in id: block, so nobody can take over
 *   an account just by registering with someone else's email address.
 * - New person: create a row.
 */
export function decideLink(byAuthId: UserRow | null, byEmail: UserRow | null, emailVerified: boolean): LinkDecision {
  if (byAuthId) return { action: "use", id: byAuthId.id };
  if (byEmail) return byEmail.auth_id === null && emailVerified ? { action: "link", id: byEmail.id } : { action: "block" };
  return { action: "create" };
}