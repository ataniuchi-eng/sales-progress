import { NextResponse } from "next/server";
import { getSession, isAdmin, sha256 } from "@/lib/auth";
import { getAllUsers, createUser, deleteUser } from "@/lib/db";

// GET: 全ユーザー取得（管理者のみ）
export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await getAllUsers();
    // パスワードハッシュは返さない（一覧表示用に平文パスワードは保持しないため）
    const safeUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      staffName: u.staff_name,
      createdAt: u.created_at,
    }));
    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error("Users fetch error:", error);
    return NextResponse.json({ error: "ユーザー取得に失敗しました" }, { status: 500 });
  }
}

// POST: ユーザー追加（管理者のみ）
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, staffName, password } = await request.json();

    if (!email || !staffName || !password) {
      return NextResponse.json({ error: "メールアドレス、担当、パスワードは必須です" }, { status: 400 });
    }

    const passwordHash = await sha256(password);
    const user = await createUser(email, passwordHash, staffName);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      staffName: user.staff_name,
      password, // 作成直後のみ平文パスワードを返す
      createdAt: user.created_at,
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }
    console.error("User create error:", error);
    return NextResponse.json({ error: "ユーザー作成に失敗しました" }, { status: 500 });
  }
}

// DELETE: ユーザー削除（管理者のみ）
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "IDは必須です" }, { status: 400 });
    }
    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User delete error:", error);
    return NextResponse.json({ error: "ユーザー削除に失敗しました" }, { status: 500 });
  }
}
