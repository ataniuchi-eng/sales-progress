import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllData, saveData, bulkSave, deleteData } from "@/lib/db";

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

// DELETE: データ削除
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 複数日削除
    if (body.dateKeys && Array.isArray(body.dateKeys)) {
      let count = 0;
      for (const dateKey of body.dateKeys) {
        await deleteData(dateKey);
        count++;
      }
      return NextResponse.json({ success: true, deletedCount: count });
    }

    // 単一日削除
    if (body.dateKey) {
      await deleteData(body.dateKey);
      return NextResponse.json({ success: true, dateKey: body.dateKey });
    }

    return NextResponse.json(
      { error: "不正なリクエスト形式です" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Data delete error:", error);
    return NextResponse.json(
      { error: "データの削除に失敗しました" },
      { status: 500 }
    );
  }
}
