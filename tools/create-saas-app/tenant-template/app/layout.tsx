import localFont from "next/font/local";
import "./style.css";
const font = localFont({ src: "../font.ttf" });
export const metadata = { title: "__APP_TITLE__" };
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={font.className}>{children}</body>
    </html>
  );
}
