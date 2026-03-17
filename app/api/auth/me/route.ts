import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getUserByEmail } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = isAdmin(session.email);
  let staffName: string | null = null;
  let role: string = "A"; // admin default

  if (!admin) {
    const user = await getUserByEmail(session.email);
    staffName = user?.staff_name || null;
    role = user?.role || "C";
  }

  return NextResponse.json({
    email: session.email,
    isAdmin: admin,
    staffName, // null for admin (can edit all), string for regular users
    role, // A=admin-like, B=budget all staff, C=no budget
  });
}
