import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getBlacklist, addBlacklistEntry, updateBlacklistEntry, deleteBlacklistEntry } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const list = await getBlacklist();
    return NextResponse.json(list);
  } catch (error) {
    console.error("Blacklist fetch error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { name, affiliation, age, birth_date, prefecture, reason, registered_by } = body;
    if (!name?.trim() || !affiliation?.trim() || !reason?.trim() || !registered_by?.trim()) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    if (reason.length > 150) {
      return NextResponse.json({ error: "理由は150文字以内で入力してください" }, { status: 400 });
    }
    const entry = await addBlacklistEntry({
      name: name.trim(), affiliation: affiliation.trim(),
      age: age != null ? Number(age) : null, birth_date: birth_date || null,
      prefecture: prefecture?.trim() || null,
      reason: reason.trim(), registered_by: registered_by.trim(),
    });
    return NextResponse.json(entry);
  } catch (error) {
    console.error("Blacklist add error:", error);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, name, affiliation, age, birth_date, prefecture, reason, registered_by } = body;
    if (!id || !name?.trim() || !affiliation?.trim() || !reason?.trim() || !registered_by?.trim()) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    await updateBlacklistEntry(id, {
      name: name.trim(), affiliation: affiliation.trim(),
      age: age != null ? Number(age) : null, birth_date: birth_date || null,
      prefecture: prefecture?.trim() || null,
      reason: reason.trim(), registered_by: registered_by.trim(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blacklist update error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
    await deleteBlacklistEntry(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blacklist delete error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
