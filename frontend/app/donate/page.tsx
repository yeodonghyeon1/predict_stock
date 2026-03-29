"use client";

import { useState } from "react";
import Link from "next/link";

const T = {
  ko: {
    back: "← 메인으로",
    title: "후원",
    desc: "서버 운영비(전기, GPU)와 서비스 개선에 사용됩니다.",
    method: "방법",
    info: "정보",
    bank: "계좌이체",
    kakaopay: "카카오페이",
    kakaopayInfo: "아래 QR 코드",
    qrLabel: "카카오페이 송금 QR",
    preparing: "준비중",
    thanks: "감사합니다.",
  },
  en: {
    back: "← Back",
    title: "Donate",
    desc: "Used for server costs (electricity, GPU) and service improvement.",
    method: "Method",
    info: "Info",
    bank: "Bank Transfer",
    kakaopay: "KakaoPay",
    kakaopayInfo: "QR code below",
    qrLabel: "KakaoPay QR",
    preparing: "Coming soon",
    thanks: "Thank you.",
  },
};

export default function DonatePage() {
  const [lang, setLang] = useState<"ko" | "en">(() => {
    if (typeof navigator !== "undefined") {
      return navigator.language.startsWith("ko") ? "ko" : "en";
    }
    return "ko";
  });

  const t = T[lang];

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40, maxWidth: 600 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Link href="/" style={{ fontSize: 12, color: "#888" }}>{t.back}</Link>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setLang("ko")}
            style={{ fontSize: 12, padding: "2px 8px", background: lang === "ko" ? "#333" : "#eee", color: lang === "ko" ? "#fff" : "#666", border: "1px solid #ccc", cursor: "pointer" }}
          >
            한국어
          </button>
          <button
            onClick={() => setLang("en")}
            style={{ fontSize: 12, padding: "2px 8px", background: lang === "en" ? "#333" : "#eee", color: lang === "en" ? "#fff" : "#666", border: "1px solid #ccc", cursor: "pointer" }}
          >
            EN
          </button>
        </div>
      </div>

      <h1 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>{t.title}</h1>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>{t.desc}</p>

      <table>
        <thead>
          <tr>
            <th>{t.method}</th>
            <th>{t.info}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t.bank}</td>
            <td>Toss Bank 1001-8776-7305</td>
          </tr>
          <tr>
            <td>{t.kakaopay}</td>
            <td>{t.kakaopayInfo}</td>
          </tr>
          <tr>
            <td>BTC</td>
            <td style={{ fontSize: 11, color: "#aaa" }}>{t.preparing}</td>
          </tr>
          <tr>
            <td>ETH</td>
            <td style={{ fontSize: 11, color: "#aaa" }}>{t.preparing}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{t.qrLabel}</p>
        <img
          src="/kakaopay-qr.png"
          alt="KakaoPay QR"
          style={{ maxWidth: 240, border: "1px solid #ddd" }}
        />
      </div>

      <p style={{ fontSize: 11, color: "#aaa", marginTop: 16, textAlign: "center" }}>
        {t.thanks}
      </p>
    </div>
  );
}
