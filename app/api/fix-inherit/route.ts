import { NextResponse } from "next/server";
import { getDataByDate, saveData } from "@/lib/db";

// 一時的なデータ修正エンドポイント: 3/27 → 3/30 のbudget/focus/RAを補完
// 使用後に削除すること
export async function GET() {
  try {
    const data27 = await getDataByDate("2025-03-27");
    const data30 = await getDataByDate("2025-03-30");

    if (!data27) {
      return NextResponse.json({ error: "3/27のデータが見つかりません" }, { status: 404 });
    }

    const merged = { ...(data30 || {}) };
    const changes: string[] = [];

    // budget（目標・見込）
    const hasBudget = merged.proper?.target > 0 || merged.proper?.forecast > 0
      || merged.bp?.target > 0 || merged.bp?.forecast > 0
      || merged.fl?.target > 0 || merged.fl?.forecast > 0
      || merged.co?.target > 0 || merged.co?.forecast > 0;
    if (!hasBudget) {
      if (data27.proper) { merged.proper = JSON.parse(JSON.stringify(data27.proper)); changes.push("proper"); }
      if (data27.bp) { merged.bp = JSON.parse(JSON.stringify(data27.bp)); changes.push("bp"); }
      if (data27.fl) { merged.fl = JSON.parse(JSON.stringify(data27.fl)); changes.push("fl"); }
      if (data27.co) { merged.co = JSON.parse(JSON.stringify(data27.co)); changes.push("co"); }
    }

    // focus（注力）
    const hasFocus = (merged.focusPeople?.length || 0) > 0 || (merged.focusProjects?.length || 0) > 0;
    if (!hasFocus) {
      if (data27.focusPeople?.length) { merged.focusPeople = JSON.parse(JSON.stringify(data27.focusPeople)); changes.push("focusPeople"); }
      if (data27.focusProjects?.length) { merged.focusProjects = JSON.parse(JSON.stringify(data27.focusProjects)); changes.push("focusProjects"); }
    }

    // RA（RA開拓）
    const hasRA = merged.ra && (
      (merged.ra.acquisitionTarget || 0) > 0 || (merged.ra.acquisitionProgress || 0) > 0
      || (merged.ra.joinTarget || 0) > 0 || (merged.ra.joinProgress || 0) > 0
      || (merged.ra.acquisitionCompanies?.length || 0) > 0
      || (merged.ra.joinCompanies?.length || 0) > 0
    );
    if (!hasRA && data27.ra) {
      merged.ra = JSON.parse(JSON.stringify(data27.ra));
      changes.push("ra");
    }

    if (changes.length === 0) {
      return NextResponse.json({ message: "3/30には既にすべてのデータが存在します。変更なし。", data30_keys: Object.keys(merged) });
    }

    await saveData("2025-03-30", merged);

    return NextResponse.json({
      success: true,
      message: `3/27から3/30へ ${changes.join(", ")} を反映しました`,
      changes,
    });
  } catch (error) {
    console.error("Fix inherit error:", error);
    return NextResponse.json({ error: "修正に失敗しました" }, { status: 500 });
  }
}
