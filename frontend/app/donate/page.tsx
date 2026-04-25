"use client";

import { useState } from "react";
import Link from "next/link";

const BTC_ADDRESS = "1ASz3fKXyYaNj62w7AfXsesQzcotPU6xtW";
const ETH_ADDRESS = "0xb40b8d151377bd5d0455935b5a98999e9f598c43";

const T = {
  ko: {
    back: "← 메인으로",
    title: "후원",
    desc: "서버 운영비(전기, GPU)와 서비스 개선에 사용됩니다.",
    method: "방법",
    address: "주소",
    copy: "복사",
    copied: "복사됨!",
    thanks: "감사합니다.",
  },
  en: {
    back: "← Back",
    title: "Donate",
    desc: "Used for server costs (electricity, GPU) and service improvement.",
    method: "Method",
    address: "Address",
    copy: "Copy",
    copied: "Copied!",
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
  const [copied, setCopied] = useState<string | null>(null);

  const t = T[lang];

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore — older browsers
    }
  };

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
            <th>{t.address}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>BTC</td>
            <td>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <code style={{ fontSize: 11, wordBreak: "break-all", fontFamily: "monospace" }}>{BTC_ADDRESS}</code>
                <button
                  onClick={() => handleCopy("btc", BTC_ADDRESS)}
                  style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {copied === "btc" ? t.copied : t.copy}
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td>ETH</td>
            <td>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <code style={{ fontSize: 11, wordBreak: "break-all", fontFamily: "monospace" }}>{ETH_ADDRESS}</code>
                <button
                  onClick={() => handleCopy("eth", ETH_ADDRESS)}
                  style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {copied === "eth" ? t.copied : t.copy}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 11, color: "#aaa", marginTop: 16, textAlign: "center" }}>
        {t.thanks}
      </p>
    </div>
  );
}
