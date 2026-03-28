import { NextResponse } from "next/server";
import { getAllData, getDataByDate, saveData } from "@/lib/db";

// 一時的なデータ修正エンドポイント
// ?mode=check で日付キー一覧を確認
// ?mode=fix&from=YYYY-MM-DD&to=YYYY-MM-DD で実行
// 使用後に削除すること
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "check";

    if (mode === "check") {
      const allData = await getAllData();
      const keys = Object.keys(allData).sort();
      const summary = keys.map(k => {
        const d = allData[k];
        return {
          key: k,
          hasBudget: !!(d.proper?.target || d.proper?.forecast || d.bp?.target || d.bp?.forecast),
          hasFocus: !!((d.focusPeople?.length || 0) > 0 || (d.focusProjects?.length || 0) > 0),
          hasRA: !!(d.ra && (d.ra.acquisitionTarget || d.ra.acquisitionProgress || d.ra.acquisitionCompanies?.length || d.ra.joinTarget || d.ra.joinProgress || d.ra.joinCompanies?.length)),
          hasStaffActivities: !!((d.staffActivities?.length || 0) > 0),
          hasAnnouncements: !!((d.announcements?.length || 0) > 0 && d.announcements.some((a: string) => a && a.trim())),
        };
      });
      return NextResponse.json({ dateKeys: keys, summary });
    }

    if (mode === "fix") {
      const fromKey = url.searchParams.get("from");
      const toKey = url.searchParams.get("to");
      if (!fromKey || !toKey) {
        return NextResponse.json({ error: "from と to パラメータが必要です (例: ?mode=fix&from=2025-03-27&to=2025-03-30)" }, { status: 400 });
      }

      const dataFrom = await getDataByDate(fromKey);
      const dataTo = await getDataByDate(toKey);

      if (!dataFrom) {
        return NextResponse.json({ error: `${fromKey} のデータが見つかりません` }, { status: 404 });
      }

      const merged = { ...(dataTo || {}) };
      const changes: string[] = [];

      // budget
      const hasBudget = merged.proper?.target > 0 || merged.proper?.forecast > 0
        || merged.bp?.target > 0 || merged.bp?.forecast > 0
        || merged.fl?.target > 0 || merged.fl?.forecast > 0
        || merged.co?.target > 0 || merged.co?.forecast > 0;
      if (!hasBudget) {
        if (dataFrom.proper) { merged.proper = JSON.parse(JSON.stringify(dataFrom.proper)); changes.push("proper"); }
        if (dataFrom.bp) { merged.bp = JSON.parse(JSON.stringify(dataFrom.bp)); changes.push("bp"); }
        if (dataFrom.fl) { merged.fl = JSON.parse(JSON.stringify(dataFrom.fl)); changes.push("fl"); }
        if (dataFrom.co) { merged.co = JSON.parse(JSON.stringify(dataFrom.co)); changes.push("co"); }
      }

      // focus
      const hasFocus = (merged.focusPeople?.length || 0) > 0 || (merged.focusProjects?.length || 0) > 0;
      if (!hasFocus) {
        if (dataFrom.focusPeople?.length) { merged.focusPeople = JSON.parse(JSON.stringify(dataFrom.focusPeople)); changes.push("focusPeople"); }
        if (dataFrom.focusProjects?.length) { merged.focusProjects = JSON.parse(JSON.stringify(dataFrom.focusProjects)); changes.push("focusProjects"); }
      }

      // RA
      const hasRA = merged.ra && (
        (merged.ra.acquisitionTarget || 0) > 0 || (merged.ra.acquisitionProgress || 0) > 0
        || (merged.ra.joinTarget || 0) > 0 || (merged.ra.joinProgress || 0) > 0
        || (merged.ra.acquisitionCompanies?.length || 0) > 0
        || (merged.ra.joinCompanies?.length || 0) > 0
      );
      if (!hasRA && dataFrom.ra) {
        merged.ra = JSON.parse(JSON.stringify(dataFrom.ra));
        changes.push("ra");
      }

      if (changes.length === 0) {
        return NextResponse.json({ message: `${toKey} には既にすべてのデータが存在します。変更なし。` });
      }

      await saveData(toKey, merged);

      return NextResponse.json({
        success: true,
        message: `${fromKey} から ${toKey} へ ${changes.join(", ")} を反映しました`,
        changes,
      });
    }

    return NextResponse.json({ error: "mode=check または mode=fix を指定してください" }, { status: 400 });
  } catch (error) {
    console.error("Fix inherit error:", error);
    return NextResponse.json({ error: "修正に失敗しました", detail: String(error) }, { status: 500 });
  }
}
