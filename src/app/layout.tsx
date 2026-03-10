import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Трудягин — работа и исполнители рядом",
  description: "Находите исполнителей для разовых задач или сами ищите работу",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
