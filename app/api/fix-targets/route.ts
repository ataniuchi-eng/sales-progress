import { NextResponse } from "next/server";
import { getDataByDate, saveData } from "../../../lib/db";
import { getSession } from "../../../lib/auth";

// 4/1のtarget値を0にリセット（一時的なエンドポイント）
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateKey = "2026-04-01";
  const data = await getDataByDate(dateKey);
  if (!data) {
    return NextResponse.json({ error: "No data found for " + dateKey }, { status: 404 });
  }

  const before = {
    proper: data.proper?.target,
    bp: data.bp?.target,
    fl: data.fl?.target,
    co: data.co?.target,
  };

  // target値のみ0にリセット（他のデータはそのまま維持）
  if (data.proper) data.proper.target = 0;
  if (data.bp) data.bp.target = 0;
  if (data.fl) data.fl.target = 0;
  if (data.co) data.co.target = 0;

  await saveData(dateKey, data);

  return NextResponse.json({
    success: true,
    message: "4/1のtarget値を0にリセットしました",
    before,
    after: {
      proper: data.proper?.target,
      bp: data.bp?.target,
      fl: data.fl?.target,
      co: data.co?.target,
    }
  });
}
