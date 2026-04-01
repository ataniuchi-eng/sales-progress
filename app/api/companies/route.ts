import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMasterCompanies, initMasterCompanies, addMasterCompany, addCustomCompany } from "@/lib/db";
import { COMPANY_LIST } from "@/app/dashboard/constants/data";

// GET: マスター企業リスト取得（テーブルが空なら初期化）
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let companies = await getMasterCompanies();

    // テーブルが空の場合は constants + custom_companies から初期化
    if (companies.length === 0) {
      await initMasterCompanies(COMPANY_LIST);
      companies = await getMasterCompanies();
    }

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Company fetch error:", error);
    return NextResponse.json({ error: "企業取得に失敗しました" }, { status: 500 });
  }
}

// POST: マスター企業追加（custom_companiesにも後方互換で追加）
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

    const trimmedName = name.trim();

    // master_companies に追加
    await addMasterCompany(trimmedName);

    // custom_companies にも後方互換で追加
    await addCustomCompany(trimmedName);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Company add error:", error);
    return NextResponse.json({ error: "企業追加に失敗しました" }, { status: 500 });
  }
}
