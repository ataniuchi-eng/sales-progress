import { sql } from "@vercel/postgres";

// テーブル作成（初回のみ）
export async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS sales_data (
      id SERIAL PRIMARY KEY,
      date_key VARCHAR(10) UNIQUE NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
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
