import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "営業ダッシュボード | Cell Promote",
  description: "営業進捗管理ダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
