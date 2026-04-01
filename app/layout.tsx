import type { Metadata } from "next";
import { ThemeWrapper } from "./theme-wrapper";

export const metadata: Metadata = {
  title: "A Dash | 営業ダッシュボード",
  description: "A Dash 営業進捗管理ダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0 }}>
        <ThemeWrapper>{children}</ThemeWrapper>
      </body>
    </html>
  );
}
