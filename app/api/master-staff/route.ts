import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getMasterStaff, initMasterStaff, addMasterStaff } from "@/lib/db";
import { STAFF_LIST } from "@/app/dashboard/constants/data";

// GET: マスター担当者取得（テーブルが空なら初期化）
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let staff = await getMasterStaff();

    // テーブルが空の場合は constants から初期化
    if (staff.length === 0) {
      await initMasterStaff(STAFF_LIST);
      staff = await getMasterStaff();
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Master staff fetch error:", error);
    return NextResponse.json({ error: "マスター担当者取得に失敗しました" }, { status: 500 });
  }
}

// POST: マスター担当者追加（管理者のみ）
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
    await addMasterStaff(name.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Master staff add error:", error);
    return NextResponse.json({ error: "担当者追加に失敗しました" }, { status: 500 });
  }
}
