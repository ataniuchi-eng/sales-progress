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

export type UserRole = "A" | "B" | "C" | "D";

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

// ===== カスタム企業管理 =====
async function ensureCompanyTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS custom_companies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// カスタム企業全取得
export async function getCustomCompanies(): Promise<string[]> {
  await ensureCompanyTable();
  const { rows } = await sql`
    SELECT name FROM custom_companies ORDER BY name
  `;
  return rows.map(r => r.name);
}

// カスタム企業追加
export async function addCustomCompany(name: string): Promise<void> {
  await ensureCompanyTable();
  await sql`
    INSERT INTO custom_companies (name) VALUES (${name})
    ON CONFLICT (name) DO NOTHING
  `;
}

// ===== マスター担当者管理 =====

async function ensureMasterStaffTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS master_staff (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// マスター担当者全取得（sort_order順）
export async function getMasterStaff(): Promise<string[]> {
  await ensureMasterStaffTable();
  const { rows } = await sql`
    SELECT name FROM master_staff ORDER BY sort_order ASC, created_at ASC
  `;
  return rows.map(r => r.name);
}

// マスター担当者初期化（初回のみ）
export async function initMasterStaff(staffList: string[]): Promise<void> {
  await ensureMasterStaffTable();
  // テーブルが空の場合のみ投入
  const { rows } = await sql`SELECT COUNT(*) as count FROM master_staff`;
  if (rows[0].count > 0) {
    return;
  }

  for (let i = 0; i < staffList.length; i++) {
    await sql`
      INSERT INTO master_staff (name, sort_order)
      VALUES (${staffList[i]}, ${i})
      ON CONFLICT (name) DO NOTHING
    `;
  }
}

// マスター担当者追加
export async function addMasterStaff(name: string): Promise<void> {
  await ensureMasterStaffTable();
  await sql`
    INSERT INTO master_staff (name, sort_order)
    VALUES (${name}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM master_staff))
    ON CONFLICT (name) DO NOTHING
  `;
}

// ===== マスター企業管理 =====

async function ensureMasterCompanyTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS master_companies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// マスター企業全取得（sort_order順）
export async function getMasterCompanies(): Promise<string[]> {
  await ensureMasterCompanyTable();
  const { rows } = await sql`
    SELECT name FROM master_companies ORDER BY sort_order ASC, created_at ASC
  `;
  return rows.map(r => r.name);
}

// マスター企業初期化（初回のみ、custom_companiesと統合）
export async function initMasterCompanies(companyList: string[]): Promise<void> {
  await ensureMasterCompanyTable();
  await ensureCompanyTable();

  // master_companiesテーブルが空の場合のみ投入
  const { rows } = await sql`SELECT COUNT(*) as count FROM master_companies`;
  if (rows[0].count > 0) {
    return;
  }

  // COMPANY_LIST + custom_companies を統合
  const seenNames = new Set<string>();
  let sortOrder = 0;

  // COMPANY_LIST を先に入れる
  for (const companyName of companyList) {
    if (!seenNames.has(companyName)) {
      seenNames.add(companyName);
      await sql`
        INSERT INTO master_companies (name, sort_order)
        VALUES (${companyName}, ${sortOrder})
        ON CONFLICT (name) DO NOTHING
      `;
      sortOrder++;
    }
  }

  // custom_companies から既存データを取得して追加
  const customCompanies = await getCustomCompanies();
  for (const companyName of customCompanies) {
    if (!seenNames.has(companyName)) {
      seenNames.add(companyName);
      await sql`
        INSERT INTO master_companies (name, sort_order)
        VALUES (${companyName}, ${sortOrder})
        ON CONFLICT (name) DO NOTHING
      `;
      sortOrder++;
    }
  }
}

// マスター企業追加
export async function addMasterCompany(name: string): Promise<void> {
  await ensureMasterCompanyTable();
  await sql`
    INSERT INTO master_companies (name, sort_order)
    VALUES (${name}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM master_companies))
    ON CONFLICT (name) DO NOTHING
  `;
}

// ===== 営業ブラックリスト =====

export interface BlacklistEntry {
  id: number;
  name: string;
  affiliation: string;
  age: number | null;
  prefecture: string | null;
  reason: string;
  registered_by: string;
  created_at: string;
  updated_at: string;
}

async function ensureBlacklistTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS sales_blacklist (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      affiliation VARCHAR(255) NOT NULL,
      age INTEGER,
      prefecture VARCHAR(100),
      reason VARCHAR(150) NOT NULL,
      registered_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function getBlacklist(): Promise<BlacklistEntry[]> {
  await ensureBlacklistTable();
  const { rows } = await sql`SELECT * FROM sales_blacklist ORDER BY created_at DESC`;
  return rows as BlacklistEntry[];
}

export async function addBlacklistEntry(entry: { name: string; affiliation: string; age: number | null; prefecture: string | null; reason: string; registered_by: string }): Promise<BlacklistEntry> {
  await ensureBlacklistTable();
  const { rows } = await sql`
    INSERT INTO sales_blacklist (name, affiliation, age, prefecture, reason, registered_by)
    VALUES (${entry.name}, ${entry.affiliation}, ${entry.age}, ${entry.prefecture}, ${entry.reason}, ${entry.registered_by})
    RETURNING *
  `;
  return rows[0] as BlacklistEntry;
}

export async function updateBlacklistEntry(id: number, entry: { name: string; affiliation: string; age: number | null; prefecture: string | null; reason: string; registered_by: string }): Promise<void> {
  await ensureBlacklistTable();
  await sql`
    UPDATE sales_blacklist SET name = ${entry.name}, affiliation = ${entry.affiliation}, age = ${entry.age}, prefecture = ${entry.prefecture}, reason = ${entry.reason}, registered_by = ${entry.registered_by}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deleteBlacklistEntry(id: number): Promise<void> {
  await ensureBlacklistTable();
  await sql`DELETE FROM sales_blacklist WHERE id = ${id}`;
}
