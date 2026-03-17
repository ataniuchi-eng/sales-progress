import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getCustomStaff, addCustomStaff } from "@/lib/db";

// GET: カスタム担当者リスト取得
export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const staff = await getCustomStaff();
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Staff fetch error:", error);
    return NextResponse.json({ error: "担当者取得に失敗しました" }, { status: 500 });
  }
}

// POST: カスタム担当者追加
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "担当者名は必須です" }, { status: 400 });
    }
    await addCustomStaff(name.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff add error:", error);
    return NextResponse.json({ error: "担当者追加に失敗しました" }, { status: 500 });
  }
}
