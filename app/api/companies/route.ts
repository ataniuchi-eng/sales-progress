import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCustomCompanies, addCustomCompany } from "@/lib/db";

// GET: カスタム企業リスト取得
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companies = await getCustomCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    console.error("Company fetch error:", error);
    return NextResponse.json({ error: "企業取得に失敗しました" }, { status: 500 });
  }
}

// POST: カスタム企業追加
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "企業名は必須です" }, { status: 400 });
    }
    await addCustomCompany(name.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Company add error:", error);
    return NextResponse.json({ error: "企業追加に失敗しました" }, { status: 500 });
  }
}
