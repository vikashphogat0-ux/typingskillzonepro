import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getStudentAccess } from "@/lib/subscription";
import { STUDENT_PLANS, getStudentPlan } from "@/lib/pricing";

/** Returns the current user's subscription status, plan, and remaining test limits. */
export async function GET(req: Request) {
  try {
    const uid = await getUserId(req);
    if (!uid) {
      return Response.json({
        signedIn: false,
        plan: "free",
        endsAt: null,
        viaInstitution: false,
        testsLeft: null,
        prices: { free: 0 },
      });
    }

    const access = await getStudentAccess(uid);

    const planId = access.plan;
    const planDef = getStudentPlan(planId);

    return Response.json({
      signedIn: true,
      plan: planId,
      endsAt: access.endsAt,
      viaInstitution: access.viaInstitution,
      testsLeft: access.testsLeft,
      prices: planDef ? { [planId]: planDef.amountPaise, free: 0 } : { free: 0 },
    });
  } catch (error) {
    console.error("/api/student-access error:", error);
    return Response.json(
      { error: "Unable to load student access." },
      { status: 500 }
    );
  }
}