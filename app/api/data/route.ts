import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllData, saveData, bulkSave } from "@/lib/db";

// GET: 全データ取得
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getAllData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Data fetch error:", error);
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: データ保存
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 単一日保存
    if (body.dateKey && body.data) {
      await saveData(body.dateKey, body.data);
      return NextResponse.json({ success: true, dateKey: body.dateKey });
    }

    // 一括インポート
    if (body.bulkData) {
      const count = await bulkSave(body.bulkData);
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json(
      { error: "不正なリクエスト形式です" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Data save error:", error);
    return NextResponse.json(
      { error: "データの保存に失敗しました" },
      { status: 500 }
    );
  }
}
