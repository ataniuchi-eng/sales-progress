import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllData, getDataByDate, saveData, bulkSave, deleteData } from "@/lib/db";

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
      // 担当別部分保存: staffName が指定された場合、その担当（+サブ担当）のデータのみ差し替え
      if (body.staffName) {
        const editableStaff = [body.staffName];
        if (body.subStaffName) editableStaff.push(body.subStaffName);
        const isEditable = (staff: string) => editableStaff.includes(staff);

        const existing = await getDataByDate(body.dateKey);
        if (existing) {
          // staffActivities: 担当別マージ
          const otherStaffActs = (existing.staffActivities || []).filter(
            (s: any) => !isEditable(s.staff)
          );
          const myStaffActs = (body.data.staffActivities || []).filter(
            (s: any) => isEditable(s.staff)
          );

          // focusPeople: 担当別マージ
          const otherFocusPeople = (existing.focusPeople || []).filter(
            (p: any) => !isEditable(p.staff)
          );
          const myFocusPeople = (body.data.focusPeople || []).filter(
            (p: any) => isEditable(p.staff)
          );

          // focusProjects: 担当別マージ
          const otherFocusProjects = (existing.focusProjects || []).filter(
            (p: any) => !isEditable(p.staff)
          );
          const myFocusProjects = (body.data.focusProjects || []).filter(
            (p: any) => isEditable(p.staff)
          );

          // staffActivities・注力以外のフィールドはロール別に制御
          // roleA/B: 予算・見込、全体連絡、RA開拓も反映
          const merged: any = {
            ...existing,
            staffActivities: [...otherStaffActs, ...myStaffActs],
            focusPeople: [...otherFocusPeople, ...myFocusPeople],
            focusProjects: [...otherFocusProjects, ...myFocusProjects],
          };
          if (body.userRole === "A" || body.userRole === "B") {
            if (body.data.proper) merged.proper = body.data.proper;
            if (body.data.bp) merged.bp = body.data.bp;
            if (body.data.fl) merged.fl = body.data.fl;
            if (body.data.co) merged.co = body.data.co;
            if (body.data.announcements) merged.announcements = body.data.announcements;
            if (body.data.ra) merged.ra = body.data.ra;
          }
          await saveData(body.dateKey, merged);
          return NextResponse.json({ success: true, dateKey: body.dateKey, mode: "staff-merge" });
        } else {
          // 既存データがない場合はそのまま保存
          await saveData(body.dateKey, body.data);
          return NextResponse.json({ success: true, dateKey: body.dateKey, mode: "staff-new" });
        }
      }

      // 管理者: 全データそのまま保存
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
