import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock AI - 주식 AI 분석",
  description:
    "AI 기반 주식 차트 패턴 감지 및 뉴스 분위기 분석. YOLOv8, BERT 모델 활용.",
  keywords: "주식, AI, 차트 패턴, 뉴스 분석, YOLOv8, BERT",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
