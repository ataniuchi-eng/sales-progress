import { NextResponse } from "next/server";
import { getAllData, saveData } from "@/lib/db";

// 一時的なエンドポイント: DB内の企業名の表記揺れを正式名称に修正
// 使用後に削除すること
const RENAME_MAP: Record<string, string> = {
  "シンクドライブ": "シンクドライブ株式会社",
  "三菱電機デジタルイノベーション": "三菱電機デジタルイノベーション株式会社",
  "ジャパンシステム": "ジャパンシステム株式会社",
  "ノースサンド": "株式会社ノースサンド",
  "ハコモノ": "株式会社hacomono",
  "augument AI株式会社": "augment AI株式会社",
};

function renameInEntries(entries: any[]): { changed: boolean; entries: any[] } {
  let changed = false;
  const updated = entries.map((e: any) => {
    if (e.company && RENAME_MAP[e.company]) {
      changed = true;
      return { ...e, company: RENAME_MAP[e.company] };
    }
    return e;
  });
  return { changed, entries: updated };
}

function renameInRACompanies(companies: any[]): { changed: boolean; companies: any[] } {
  let changed = false;
  const updated = companies.map((c: any) => {
    if (c.name && RENAME_MAP[c.name]) {
      changed = true;
      return { ...c, name: RENAME_MAP[c.name] };
    }
    return c;
  });
  return { changed, companies: updated };
}

export async function GET() {
  try {
    const allData = await getAllData();
    const changes: string[] = [];

    for (const [key, dayData] of Object.entries(allData)) {
      if (!key.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
      let modified = false;
      const data = JSON.parse(JSON.stringify(dayData));

      // staffActivities
      if (Array.isArray(data.staffActivities)) {
        for (let i = 0; i < data.staffActivities.length; i++) {
          const s = data.staffActivities[i];
          for (const field of ["raEntries", "caEntries", "raPriceUpEntries", "caPriceUpEntries"]) {
            if (Array.isArray(s[field])) {
              const result = renameInEntries(s[field]);
              if (result.changed) { s[field] = result.entries; modified = true; }
            }
          }
        }
      }

      // focusProjects
      if (Array.isArray(data.focusProjects)) {
        const result = renameInEntries(data.focusProjects);
        if (result.changed) { data.focusProjects = result.entries; modified = true; }
      }

      // RA companies
      if (data.ra) {
        if (Array.isArray(data.ra.acquisitionCompanies)) {
          const result = renameInRACompanies(data.ra.acquisitionCompanies);
          if (result.changed) { data.ra.acquisitionCompanies = result.companies; modified = true; }
        }
        if (Array.isArray(data.ra.joinCompanies)) {
          const result = renameInRACompanies(data.ra.joinCompanies);
          if (result.changed) { data.ra.joinCompanies = result.companies; modified = true; }
        }
      }

      if (modified) {
        await saveData(key, data);
        changes.push(key);
      }
    }

    return NextResponse.json({
      success: true,
      renameMap: RENAME_MAP,
      modifiedDates: changes,
      modifiedCount: changes.length,
    });
  } catch (error) {
    console.error("Fix company names error:", error);
    return NextResponse.json({ error: "修正に失敗しました", detail: String(error) }, { status: 500 });
  }
}
