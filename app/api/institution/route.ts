import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getMembership } from "@/lib/inst-server";
import {
  genJoinCode,
  isStaff,
  validateInstitution,
} from "@/lib/institution";
import { INSTITUTE_PLANS } from "@/lib/pricing";

/** Return institute information and approved-staff overview statistics. */
export async function GET(req: Request) {
  try {
    const uid = await getUserId(req);

    if (!uid) {
      return Response.json({ signedIn: false }, { status: 401 });
    }

    const m = await getMembership(uid);

    if (!m) {
      return Response.json({
        signedIn: true,
        institute: null,
        stats: null,
        team: [],
        plans: Object.values(INSTITUTE_PLANS),
      });
    }

    const staff = isStaff(m.role);
    let stats = null;
    let team: unknown[] = [];

    if (staff && m.status === "approved") {
      const [result] = await sql()`
        SELECT
          (
            SELECT count(*)::int
            FROM institution_members
            WHERE institution_id = ${m.institution_id}
              AND role = 'student'
          ) AS students,

          (
            SELECT count(DISTINCT r.user_id)::int
            FROM results r
            JOIN institution_members im
              ON im.user_id = r.user_id
            WHERE im.institution_id = ${m.institution_id}
              AND im.role = 'student'
              AND r.created_at > now() - interval '7 days'
          ) AS active_week,

          (
            SELECT count(*)::int
            FROM results r
            JOIN institution_members im
              ON im.user_id = r.user_id
            WHERE im.institution_id = ${m.institution_id}
              AND im.role = 'student'
              AND r.created_at > now() - interval '7 days'
          ) AS tests_week,

          (
            SELECT round(avg(r.accuracy), 1)
            FROM results r
            JOIN institution_members im
              ON im.user_id = r.user_id
            WHERE im.institution_id = ${m.institution_id}
              AND im.role = 'student'
              AND NOT r.flagged
              AND r.created_at > now() - interval '30 days'
          ) AS avg_accuracy,

          (
            SELECT round(avg(r.net_wpm), 1)
            FROM results r
            JOIN institution_members im
              ON im.user_id = r.user_id
            WHERE im.institution_id = ${m.institution_id}
              AND im.role = 'student'
              AND NOT r.flagged
              AND r.created_at > now() - interval '30 days'
          ) AS avg_wpm
      `;

      stats = result;

      team = await sql()`
        SELECT u.id, u.name, u.email, im.role
        FROM institution_members im
        JOIN users u ON u.id = im.user_id
        WHERE im.institution_id = ${m.institution_id}
          AND im.role <> 'student'
        ORDER BY im.role, u.name
      `;
    }

    return Response.json({
      signedIn: true,
      institute: {
        id: m.institution_id,
        name: m.name,
        role: m.role,
        status: m.status,
        joinCode:
          staff && m.status === "approved"
            ? m.join_code
            : undefined,
      },
      stats,
      team,
      plans: Object.values(INSTITUTE_PLANS),
    });
  } catch (error) {
    console.error("Institute GET failed:", error);
    return Response.json(
      { error: "Unable to load institute information." },
      { status: 500 }
    );
  }
}

/** Register a typing centre pending administrator approval. */
export async function POST(req: Request) {
  try {
    const uid = await getUserId(req);

    if (!uid) {
      return Response.json(
        { error: "Sign in before registering your institute." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const input = {
      name: String(body.name ?? ""),
      city: String(body.city ?? ""),
      state: String(body.state ?? ""),
      phone: String(body.phone ?? ""),
      address: String(body.address ?? ""),
      contactEmail: String(body.contactEmail ?? ""),
    };

    const errors = validateInstitution(input);

    if (errors.length) {
      return Response.json(
        { error: errors.join(" ") },
        { status: 422 }
      );
    }

    if (await getMembership(uid)) {
      return Response.json(
        { error: "Your account already belongs to an institute." },
        { status: 409 }
      );
    }

    const db = sql();

    for (let attempt = 0; attempt < 5; attempt++) {
      const joinCode = genJoinCode();

      try {
        const [institution] = await db`
          INSERT INTO institutions (
            name, city, state, phone, address,
            contact_email, join_code, owner_id
          )
          VALUES (
            ${input.name.trim()},
            ${input.city.trim()},
            ${input.state.trim()},
            ${input.phone.trim()},
            ${input.address.trim() || null},
            ${input.contactEmail.trim() || null},
            ${joinCode},
            ${uid}
          )
          RETURNING id
        `;

        try {
          await db`
            INSERT INTO institution_members (
              institution_id, user_id, role
            )
            VALUES (${institution.id}, ${uid}, 'owner')
          `;
        } catch (membershipError) {
          try {
            await db`
              DELETE FROM institutions
              WHERE id = ${institution.id}
            `;
          } catch (cleanupError) {
            console.error("Institute cleanup failed:", cleanupError);
          }

          console.error(
            "Owner membership creation failed:",
            membershipError
          );

          return Response.json(
            { error: "Could not finish institute registration." },
            { status: 500 }
          );
        }

        return Response.json({ ok: true }, { status: 201 });
      } catch (error: any) {
        if (
          error?.code === "23505" &&
          String(error?.constraint ?? "").includes("join_code")
        ) {
          continue;
        }

        console.error("Institute registration failed:", error);

        return Response.json(
          { error: "Could not create the institute. Try again." },
          { status: 500 }
        );
      }
    }

    return Response.json(
      { error: "Could not generate a unique join code." },
      { status: 500 }
    );
  } catch (error) {
    console.error("Institute POST failed:", error);
    return Response.json(
      { error: "Unable to register the institute." },
      { status: 500 }
    );
  }
}