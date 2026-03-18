import { sql } from "@vercel/postgres";

// テーブル作成（初回のみ）
export async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS sales_data (
      id SERIAL PRIMARY KEY,
      date_key VARCHAR(255) UNIQUE NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  // 既存テーブルのdate_keyカラムがVARCHAR(10)の場合に拡張
  try {
    await sql`ALTER TABLE sales_data ALTER COLUMN date_key TYPE VARCHAR(255)`;
  } catch (e) {
    // 既にVARCHAR(255)の場合は無視
  }
}

// 全データ取得
export async function getAllData(): Promise<Record<string, any>> {
  await ensureTable();
  const { rows } = await sql`
    SELECT date_key, data FROM sales_data ORDER BY date_key
  `;
  const result: Record<string, any> = {};
  for (const row of rows) {
    result[row.date_key] = row.data;
  }
  return result;
}

// 特定日のデータ取得
export async function getDataByDate(dateKey: string): Promise<any | null> {
  await ensureTable();
  const { rows } = await sql`
    SELECT data FROM sales_data WHERE date_key = ${dateKey}
  `;
  return rows.length > 0 ? rows[0].data : null;
}

// データ保存（UPSERT）
export async function saveData(dateKey: string, data: any): Promise<void> {
  await ensureTable();
  await sql`
    INSERT INTO sales_data (date_key, data, updated_at)
    VALUES (${dateKey}, ${JSON.stringify(data)}::jsonb, NOW())
    ON CONFLICT (date_key)
    DO UPDATE SET data = ${JSON.stringify(data)}::jsonb, updated_at = NOW()
  `;
}

// 複数日分一括保存（インポート用）
export async function bulkSave(allData: Record<string, any>): Promise<number> {
  await ensureTable();
  let count = 0;
  for (const [dateKey, data] of Object.entries(allData)) {
    await saveData(dateKey, data);
    count++;
  }
  return count;
}

// データ削除
export async function deleteData(dateKey: string): Promise<void> {
  await sql`DELETE FROM sales_data WHERE date_key = ${dateKey}`;
}

// ===== ユーザー管理 =====

export type UserRole = "A" | "B" | "C";

export interface AppUser {
  id: number;
  email: string;
  password_hash: string;
  staff_name: string;
  role: UserRole;
  sub_staff: string | null;
  created_at: string;
}

// ユーザーテーブル作成
export async function ensureUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      staff_name VARCHAR(255) NOT NULL,
      role VARCHAR(1) NOT NULL DEFAULT 'C',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  // 既存テーブルにroleカラムがない場合に追加
  try {
    await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role VARCHAR(1) NOT NULL DEFAULT 'C'`;
  } catch (e) {
    // 既にある場合は無視
  }
  // サブ担当カラム追加
  try {
    await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS sub_staff VARCHAR(255) DEFAULT NULL`;
  } catch (e) {
    // 既にある場合は無視
  }
}

// 担当者テーブル作成
export async function ensureStaffTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS custom_staff (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// ユーザー全取得
export async function getAllUsers(): Promise<AppUser[]> {
  await ensureUsersTable();
  const { rows } = await sql`
    SELECT id, email, password_hash, staff_name, role, sub_staff, created_at FROM app_users ORDER BY created_at DESC
  `;
  return rows as AppUser[];
}

// メールでユーザー取得
export async function getUserByEmail(email: string): Promise<AppUser | null> {
  await ensureUsersTable();
  const { rows } = await sql`
    SELECT id, email, password_hash, staff_name, role, sub_staff, created_at FROM app_users WHERE email = ${email}
  `;
  return rows.length > 0 ? (rows[0] as AppUser) : null;
}

// ユーザー追加
export async function createUser(email: string, passwordHash: string, staffName: string, role: UserRole = "C", subStaff: string | null = null): Promise<AppUser> {
  await ensureUsersTable();
  const { rows } = await sql`
    INSERT INTO app_users (email, password_hash, staff_name, role, sub_staff)
    VALUES (${email}, ${passwordHash}, ${staffName}, ${role}, ${subStaff})
    RETURNING id, email, password_hash, staff_name, role, sub_staff, created_at
  `;
  return rows[0] as AppUser;
}

// ユーザー権限更新
export async function updateUserRole(id: number, role: UserRole): Promise<void> {
  await ensureUsersTable();
  await sql`UPDATE app_users SET role = ${role} WHERE id = ${id}`;
}

// サブ担当更新
export async function updateUserSubStaff(id: number, subStaff: string | null): Promise<void> {
  await ensureUsersTable();
  await sql`UPDATE app_users SET sub_staff = ${subStaff} WHERE id = ${id}`;
}

// ユーザー削除
export async function deleteUser(id: number): Promise<void> {
  await ensureUsersTable();
  await sql`DELETE FROM app_users WHERE id = ${id}`;
}

// カスタム担当者全取得
export async function getCustomStaff(): Promise<string[]> {
  await ensureStaffTable();
  const { rows } = await sql`
    SELECT name FROM custom_staff ORDER BY name
  `;
  return rows.map(r => r.name);
}

// カスタム担当者追加
export async function addCustomStaff(name: string): Promise<void> {
  await ensureStaffTable();
  await sql`
    INSERT INTO custom_staff (name) VALUES (${name})
    ON CONFLICT (name) DO NOTHING
  `;
}
