import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@vercel/postgres";

// POST: staffActivitiesのみリセット
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sql`
      UPDATE sales_data
      SET data = jsonb_set(data, '{staffActivities}', '[]'::jsonb),
          updated_at = NOW()
    `;
    return NextResponse.json({
      success: true,
      message: "全日付のstaffActivitiesをリセットしました",
      rowCount: result.rowCount
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { error: "リセットに失敗しました" },
      { status: 500 }
    );
  }
}
