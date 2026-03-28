import { NextResponse } from "next/server";
import { getAllData } from "@/lib/db";

// 一時的なエンドポイント: DB内の全企業名を抽出し、COMPANY_LISTにないものを特定
// 使用後に削除すること
export async function GET() {
  try {
    const allData = await getAllData();
    const companySet = new Set<string>();

    // 全日付のstaffActivitiesからcompany名を収集
    for (const [key, dayData] of Object.entries(allData)) {
      if (!key.match(/^\d{4}-\d{2}-\d{2}$/)) continue; // 日付キーのみ
      const staffActivities = (dayData as any)?.staffActivities;
      if (!Array.isArray(staffActivities)) continue;

      for (const staff of staffActivities) {
        // raEntries
        if (Array.isArray(staff.raEntries)) {
          for (const e of staff.raEntries) {
            if (e.company && e.company.trim()) companySet.add(e.company.trim());
          }
        }
        // caEntries
        if (Array.isArray(staff.caEntries)) {
          for (const e of staff.caEntries) {
            if (e.company && e.company.trim()) companySet.add(e.company.trim());
          }
        }
        // raPriceUpEntries
        if (Array.isArray(staff.raPriceUpEntries)) {
          for (const e of staff.raPriceUpEntries) {
            if (e.company && e.company.trim()) companySet.add(e.company.trim());
          }
        }
        // caPriceUpEntries
        if (Array.isArray(staff.caPriceUpEntries)) {
          for (const e of staff.caPriceUpEntries) {
            if (e.company && e.company.trim()) companySet.add(e.company.trim());
          }
        }
      }

      // focusProjects
      const projects = (dayData as any)?.focusProjects;
      if (Array.isArray(projects)) {
        for (const p of projects) {
          if (p.company && p.company.trim()) companySet.add(p.company.trim());
        }
      }

      // RA acquisitionCompanies / joinCompanies
      const ra = (dayData as any)?.ra;
      if (ra) {
        if (Array.isArray(ra.acquisitionCompanies)) {
          for (const c of ra.acquisitionCompanies) {
            if (c.name && c.name.trim()) companySet.add(c.name.trim());
          }
        }
        if (Array.isArray(ra.joinCompanies)) {
          for (const c of ra.joinCompanies) {
            if (c.name && c.name.trim()) companySet.add(c.name.trim());
          }
        }
      }
    }

    // COMPANY_LISTと比較
    const COMPANY_LIST = [
      "株式会社エヌ・エー・シー","株式会社ノースサンド","株式会社コミット","伊藤忠テクノソリューションズ株式会社",
      "株式会社ＮＴＴデータ・ニューソン","マンパワーグループ株式会社","株式会社OSK","GVA TECH株式会社",
      "ジャパンシステム株式会社","リレセス株式会社","株式会社エルシーツー","株式会社エンジョイ",
      "株式会社アイグローブ","株式会社カカクコム","ネオス株式会社","情報システムサービス株式会社",
      "株式会社YSLソリューション","株式会社インターネットイニシアティブ","株式会社OGS","スカイネット株式会社",
      "日鉄ソリューションズ株式会社","株式会社LASSIC","Acrosstudio株式会社","株式会社Pro-SPIRE",
      "株式会社ＮＴＴデータ・ビジネスブレインズ","富士ソフト株式会社","葵屋株式会社","株式会社カスタネット",
      "ACP有限責任事業組合","91works株式会社","株式会社テクノプラン","Sky株式会社",
      "PCIソリューションズ株式会社","株式会社HBA","株式会社グローバルビジョンテクノロジー",
      "パーソルクロステクノロジー株式会社","株式会社HES","株式会社カヤックボンド","株式会社マイクロテック",
      "エヌシーアイ総合システム株式会社","株式会社サイジスタ","ギグワークスクロスアイティ株式会社",
      "日本インフォメーション株式会社","株式会社テイクス","株式会社Q'sfix","株式会社ABI",
      "株式会社エヌアイデイ","キヤノン電子テクノロジー株式会社","アバナード株式会社","インターノウス株式会社",
      "株式会社SIGNPOST","P.S.Ace株式会社","株式会社システムイオ","株式会社ウェブエッジ",
      "CTCテクノロジー株式会社","株式会社FBS","日本総合システム株式会社","アビームコンサルティング株式会社",
      "株式会社エイジェックO&Mインテグレート","株式会社コア","PwC Japan合同会社","株式会社Miraie",
      "株式会社ぐるなび","株式会社D-Standing","株式会社ビズリンク","株式会社トラント",
      "株式会社イースト・コースト・ワン","株式会社トラストバンク","TIS株式会社","ケーアイディー株式会社",
      "株式会社電通総研テクノロジー","株式会社アイ・エス・ビー","INTLOOP株式会社","One人事株式会社",
      "株式会社フューチャ技研","株式会社FLINTERS","株式会社ecbeing","Cotofure株式会社",
      "株式会社エーアイネット・テクノロジ","株式会社dcWORKS","株式会社システナ","鈴与シンワート株式会社",
      "楽天グループ株式会社","株式会社アドービジネスコンサルタント","エクシオグループ株式会社",
      "キャップジェミニ株式会社","ソフトヒューベリオン株式会社","株式会社東邦システムサイエンス",
      "株式会社Olive","日本たばこ産業株式会社","株式会社ビジネスブレイン太田昭和",
      "株式会社NTTデータ先端技術","日本テクノストラクチャア株式会社","株式会社クエスト",
      "株式会社BTM","株式会社NTTデータ","株式会社Altus-Five","株式会社レックアイ",
      "株式会社コモドソリューションズ","株式会社itoq","株式会社シーイーシー",
      "NTT-ATシステムズ株式会社","株式会社ドコモCS","株式会社CoToMa","株式会社WhiteSpark",
      "セルプロモート株式会社",
    ];

    const companyListSet = new Set(COMPANY_LIST);
    const allFound = Array.from(companySet).sort((a, b) => a.localeCompare(b, "ja"));
    const notInList = allFound.filter(c => !companyListSet.has(c));
    const inList = allFound.filter(c => companyListSet.has(c));

    return NextResponse.json({
      totalUniqueCompanies: allFound.length,
      notInCompanyList: notInList,
      notInCompanyListCount: notInList.length,
      inCompanyList: inList,
      inCompanyListCount: inList.length,
    });
  } catch (error) {
    console.error("Check companies error:", error);
    return NextResponse.json({ error: "失敗しました", detail: String(error) }, { status: 500 });
  }
}
