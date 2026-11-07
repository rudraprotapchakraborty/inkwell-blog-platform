import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuth, isAdmin, type Role } from "@/lib/auth";
import { countAdmins, deleteUser, findUserByAuth, setUserRole } from "@/lib/users";

export const runtime = "nodejs";

/**
 * Managing one account. Admin-only, with two rules that exist to stop the site
 * being locked out of its own administration:
 *
 *  - nobody may change or delete their own account here, because the session
 *    token would keep claiming a role the database no longer agrees with, and
 *    an admin who demotes themselves cannot undo it;
 *  - the last remaining admin may not be demoted or deleted, since there would
 *    then be no account able to promote anyone back.
 */
async function guard(request: NextRequest, id: string) {
  const auth = getAuth(request);
  if (!auth) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isAdmin(auth)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return { error: NextResponse.json({ error: "Account not found" }, { status: 404 }) };
  }

  if (auth.sub === id) {
    return {
      error: NextResponse.json(
        { error: "You can't change your own account here." },
        { status: 400 }
      ),
    };
  }

  const target = await findUserByAuth(id);
  if (!target) {
    return { error: NextResponse.json({ error: "Account not found" }, { status: 404 }) };
  }

  return { oid, target };
}

/** Changes an account's role. Body: `{ role: "admin" | "user" }`. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const checked = await guard(request, id);
  if ("error" in checked) return checked.error;

  let role: Role;
  try {
    const body = await request.json();
    if (body?.role !== "admin" && body?.role !== "user") {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    role = body.role;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const currentRole = checked.target.role;
  if (currentRole === "admin" && role === "user" && (await countAdmins()) <= 1) {
    return NextResponse.json(
      { error: "This is the only administrator. Promote someone else first." },
      { status: 400 }
    );
  }

  try {
    const ok = await setUserRole(checked.oid, role);
    if (!ok) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error("Failed to change account role:", err);
    return NextResponse.json({ error: "Could not update this account." }, { status: 500 });
  }
}

/** Deletes an account. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const checked = await guard(request, id);
  if ("error" in checked) return checked.error;

  const currentRole = checked.target.role;
  if (currentRole === "admin" && (await countAdmins()) <= 1) {
    return NextResponse.json(
      { error: "This is the only administrator. Promote someone else first." },
      { status: 400 }
    );
  }

  try {
    const ok = await deleteUser(checked.oid);
    if (!ok) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete account:", err);
    return NextResponse.json({ error: "Could not delete this account." }, { status: 500 });
  }
}
