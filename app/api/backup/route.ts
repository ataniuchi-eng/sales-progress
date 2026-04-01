import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSession, isAdmin } from "@/lib/auth";
import { getAllData, bulkSave, deleteData, ensureTable, ensureUsersTable, ensureStaffTable } from "@/lib/db";

// ===== ヘルパー: 各テーブルの全件取得 =====
async function getAllUsers() {
  await ensureUsersTable();
  const { rows } = await sql`SELECT id, email, password_hash, staff_name, role, sub_staff, created_at FROM app_users ORDER BY id`;
  return rows;
}

async function getAllMasterStaff() {
  try {
    const { rows } = await sql`SELECT name, sort_order FROM master_staff ORDER BY sort_order ASC, created_at ASC`;
    return rows;
  } catch { return []; }
}

async function getAllMasterCompanies() {
  try {
    const { rows } = await sql`SELECT name, sort_order FROM master_companies ORDER BY sort_order ASC, created_at ASC`;
    return rows;
  } catch { return []; }
}

async function getAllCustomStaff() {
  try {
    await ensureStaffTable();
    const { rows } = await sql`SELECT name FROM custom_staff ORDER BY name`;
    return rows.map(r => r.name);
  } catch { return []; }
}

async function getAllCustomCompanies() {
  try {
    const { rows } = await sql`SELECT name FROM custom_companies ORDER BY name`;
    return rows.map(r => r.name);
  } catch { return []; }
}

// GET: 全データをバックアップ用JSONとしてエクスポート
export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [data, users, masterStaff, masterCompanies, customStaff, customCompanies] = await Promise.all([
      getAllData(),
      getAllUsers(),
      getAllMasterStaff(),
      getAllMasterCompanies(),
      getAllCustomStaff(),
      getAllCustomCompanies(),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: 2,
      data,
      users,
      masterStaff,
      masterCompanies,
      customStaff,
      customCompanies,
    };
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="adash-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup export error:", error);
    return NextResponse.json({ error: "バックアップの作成に失敗しました" }, { status: 500 });
  }
}

// POST: バックアップJSONからデータをリストア
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // バックアップ形式チェック
    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json({ error: "無効なバックアップファイル形式です" }, { status: 400 });
    }

    const mode = body.mode || "merge"; // "merge" or "replace"
    const results: Record<string, number> = {};

    // ===== sales_data のリストア =====
    if (mode === "replace") {
      const existingData = await getAllData();
      for (const key of Object.keys(existingData)) {
        await deleteData(key);
      }
    }
    results.salesData = await bulkSave(body.data);

    // ===== ユーザーのリストア =====
    if (body.users && Array.isArray(body.users) && body.users.length > 0) {
      await ensureUsersTable();
      if (mode === "replace") {
        await sql`DELETE FROM app_users`;
      }
      let userCount = 0;
      for (const u of body.users) {
        try {
          await sql`
            INSERT INTO app_users (email, password_hash, staff_name, role, sub_staff)
            VALUES (${u.email}, ${u.password_hash}, ${u.staff_name}, ${u.role || "C"}, ${u.sub_staff || null})
            ON CONFLICT (email) DO UPDATE SET
              password_hash = ${u.password_hash},
              staff_name = ${u.staff_name},
              role = ${u.role || "C"},
              sub_staff = ${u.sub_staff || null}
          `;
          userCount++;
        } catch (e) {
          console.error("User restore error:", u.email, e);
        }
      }
      results.users = userCount;
    }

    // ===== マスター担当者のリストア =====
    if (body.masterStaff && Array.isArray(body.masterStaff) && body.masterStaff.length > 0) {
      try {
        await sql`CREATE TABLE IF NOT EXISTS master_staff (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`;
        if (mode === "replace") {
          await sql`DELETE FROM master_staff`;
        }
        let staffCount = 0;
        for (const s of body.masterStaff) {
          await sql`
            INSERT INTO master_staff (name, sort_order)
            VALUES (${s.name}, ${s.sort_order || 0})
            ON CONFLICT (name) DO UPDATE SET sort_order = ${s.sort_order || 0}
          `;
          staffCount++;
        }
        results.masterStaff = staffCount;
      } catch (e) {
        console.error("Master staff restore error:", e);
      }
    }

    // ===== マスター企業のリストア =====
    if (body.masterCompanies && Array.isArray(body.masterCompanies) && body.masterCompanies.length > 0) {
      try {
        await sql`CREATE TABLE IF NOT EXISTS master_companies (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`;
        if (mode === "replace") {
          await sql`DELETE FROM master_companies`;
        }
        let compCount = 0;
        for (const c of body.masterCompanies) {
          await sql`
            INSERT INTO master_companies (name, sort_order)
            VALUES (${c.name}, ${c.sort_order || 0})
            ON CONFLICT (name) DO UPDATE SET sort_order = ${c.sort_order || 0}
          `;
          compCount++;
        }
        results.masterCompanies = compCount;
      } catch (e) {
        console.error("Master companies restore error:", e);
      }
    }

    // ===== カスタム担当者のリストア =====
    if (body.customStaff && Array.isArray(body.customStaff) && body.customStaff.length > 0) {
      try {
        await ensureStaffTable();
        if (mode === "replace") {
          await sql`DELETE FROM custom_staff`;
        }
        let csCount = 0;
        for (const name of body.customStaff) {
          await sql`INSERT INTO custom_staff (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
          csCount++;
        }
        results.customStaff = csCount;
      } catch (e) {
        console.error("Custom staff restore error:", e);
      }
    }

    // ===== カスタム企業のリストア =====
    if (body.customCompanies && Array.isArray(body.customCompanies) && body.customCompanies.length > 0) {
      try {
        await sql`CREATE TABLE IF NOT EXISTS custom_companies (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT NOW())`;
        if (mode === "replace") {
          await sql`DELETE FROM custom_companies`;
        }
        let ccCount = 0;
        for (const name of body.customCompanies) {
          await sql`INSERT INTO custom_companies (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
          ccCount++;
        }
        results.customCompanies = ccCount;
      } catch (e) {
        console.error("Custom companies restore error:", e);
      }
    }

    return NextResponse.json({ success: true, mode, results });
  } catch (error) {
    console.error("Backup restore error:", error);
    return NextResponse.json({ error: "リストアに失敗しました" }, { status: 500 });
  }
}
