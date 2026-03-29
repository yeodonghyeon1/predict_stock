"use client";

import { useState, useCallback, useEffect } from "react";

interface Detection {
  pattern: string;
  confidence: number;
  signal: string;
  signal_ko: string;
}

interface ChartResult {
  detections: Detection[];
  annotated_image: string;
  primary_signal: string;
  primary_signal_ko: string;
  pattern_count: number;
  vision_analysis: string;
}

interface AskResult {
  answer: string;
  source: "llm" | "basic";
}

const T = {
  ko: {
    title: "Stock AI 분석",
    donate: "후원",
    warning: "AI 분석 결과를 맹신하지 마십시오. 본 서비스는 참고용이며 투자 판단의 근거가 될 수 없습니다. 모델의 정확도는 제한적이고, 시장 상황에 따라 결과가 달라질 수 있습니다. 모든 투자 결정과 그에 따른 손실은 전적으로 이용자 본인의 책임입니다.",
    chartTitle: "차트 패턴 분석",
    chartDesc: "주식 라인 차트 캡처를 올리면 AI가 패턴(삼중천정, 삼중바닥, M자, W자, 삼각수렴 등)을 감지합니다. 객체인식은 라인 차트에서 가장 정확합니다.",
    upload: "클릭, 드래그, 또는 Ctrl+V로 차트 이미지 붙여넣기",
    analyzing: "차트 분석 중...",
    detSignal: "객체인식 패턴 시그널",
    detCount: "개 패턴 감지",
    detPattern: "객체인식 패턴",
    confidence: "신뢰도",
    signal: "시그널",
    visionTitle: "AI 차트 분석",
    askTitle: "종목 질문",
    askDesc: "종목명과 궁금한 점을 입력하세요. 최신 뉴스와 차트 분석 결과를 종합하여 답변합니다.",
    chartReflected: " (위 차트 분석 결과가 자동으로 반영됩니다)",
    tickerLabel: "종목명/티커",
    tickerPh: "예: AAPL, 삼성전자, Tesla",
    questionLabel: "질문",
    questionPh: "예: 지금 매수해도 될까? / 최근 이슈가 뭐야?",
    submit: "질문",
    loading: "분석 중...",
    result: "분석 결과",
    noApi: "[기본 모드 - API 키 미설정]",
    opensource: "본 프로젝트는",
    opensourceLink: "오픈소스",
    opensourceEnd: "로 공개되어 있으며, 누구나 자유롭게 사용·수정·배포할 수 있습니다. 서비스 운영에 필요한 서버·모델 유지 비용 충당을 위해 광고가 포함되어 있으나, 그 외 상업적 수익을 목적으로 하지 않습니다.",
    defaultQ: "현재 상황 분석해줘",
  },
  en: {
    title: "Stock AI Analysis",
    donate: "Donate",
    warning: "Do not blindly trust AI analysis results. This service is for reference only and cannot be the basis for investment decisions. Model accuracy is limited and results may vary depending on market conditions. All investment decisions and resulting losses are entirely the responsibility of the user.",
    chartTitle: "Chart Pattern Analysis",
    chartDesc: "Upload a stock line chart screenshot and AI will detect patterns (head & shoulders, double top/bottom, triangle, etc.). Object detection works best with line charts.",
    upload: "Click, drag, or Ctrl+V to paste chart image",
    analyzing: "Analyzing chart...",
    detSignal: "Object Detection Signal",
    detCount: " patterns detected",
    detPattern: "Detection Pattern",
    confidence: "Confidence",
    signal: "Signal",
    visionTitle: "AI Chart Analysis",
    askTitle: "Stock Question",
    askDesc: "Enter a stock name and your question. We'll analyze recent news and chart data to provide an answer.",
    chartReflected: " (Chart analysis above is automatically included)",
    tickerLabel: "Ticker",
    tickerPh: "e.g., AAPL, TSLA, MSFT",
    questionLabel: "Question",
    questionPh: "e.g., Should I buy now? / What's the recent trend?",
    submit: "Ask",
    loading: "Analyzing...",
    result: "Analysis Result",
    noApi: "[Basic mode - No API key]",
    opensource: "This project is",
    opensourceLink: "open source",
    opensourceEnd: " and free to use, modify, and distribute. Ads are included to cover server and model maintenance costs, but no other commercial revenue is intended.",
    defaultQ: "Analyze current situation",
  },
};

export default function Home() {
  const [lang, setLang] = useState<"ko" | "en">(() => {
    if (typeof navigator !== "undefined") {
      return navigator.language.startsWith("ko") ? "ko" : "en";
    }
    return "ko";
  });
  const [chartResult, setChartResult] = useState<ChartResult | null>(null);
  const [askResult, setAskResult] = useState<AskResult | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [askLoading, setAskLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [ticker, setTicker] = useState("");
  const [question, setQuestion] = useState("");

  const t = T[lang];

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setFileName(file.name || "clipboard-image");
    setChartLoading(true);
    setChartResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/analyze-chart", { method: "POST", body: formData });
      if (!res.ok) throw new Error("fail");
      setChartResult(await res.json());
    } catch {
      setChartResult(null);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handleFile]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() && !question.trim()) return;
    setAskLoading(true);
    setAskResult(null);
    try {
      const body: Record<string, unknown> = {
        query: ticker.trim(),
        question: question.trim() || `${ticker.trim()} ${t.defaultQ}`,
      };
      if (chartResult) {
        if (chartResult.detections.length > 0) {
          body.chart_patterns = chartResult.detections.map((d) => ({
            pattern: d.pattern,
            confidence: d.confidence,
            signal: d.signal,
          }));
        }
        if (chartResult.vision_analysis) {
          body.chart_vision_analysis = chartResult.vision_analysis;
        }
      }
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("fail");
      setAskResult(await res.json());
    } catch {
      setAskResult(null);
    } finally {
      setAskLoading(false);
    }
  };

  const signalClass = (s: string) =>
    s === "Buy" ? "signal-buy" : s === "Sell" ? "signal-sell" : "signal-hold";

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 18, fontWeight: "bold", margin: 0 }}>{t.title}</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
          <a href="/donate" style={{ fontSize: 12, color: "#888" }}>{t.donate}</a>
        </div>
      </div>

      {/* Warning */}
      <div style={{ background: "#fff8e1", border: "1px solid #ffe082", padding: "8px 12px", marginBottom: 16, fontSize: 12, color: "#795548" }}>
        {t.warning}
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "0 0 16px" }} />

      {/* === Section 1: Chart Upload === */}
      <h2 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 8 }}>{t.chartTitle}</h2>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{t.chartDesc}</p>

      <div
        className="border-box"
        style={{ textAlign: "center", cursor: "pointer", background: "#fafafa" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = (ev) => {
            const f = (ev.target as HTMLInputElement).files?.[0];
            if (f) handleFile(f);
          };
          input.click();
        }}
      >
        <p style={{ color: "#888", fontSize: 13 }}>
          {fileName || t.upload}
        </p>
      </div>

      {chartLoading && <p style={{ textAlign: "center", color: "#888", fontSize: 13 }}>{t.analyzing}</p>}

      {chartResult && (
        <>
          <div className="border-box" style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "#888" }}>{t.detSignal}</span>
            <div className={signalClass(chartResult.primary_signal)} style={{ fontSize: 22, margin: "4px 0" }}>
              {lang === "ko" ? chartResult.primary_signal_ko : chartResult.primary_signal}
            </div>
            <span style={{ fontSize: 12, color: "#888" }}>{chartResult.pattern_count}{t.detCount}</span>
          </div>

          {chartResult.annotated_image && (
            <div className="border-box" style={{ padding: 4 }}>
              <img src={chartResult.annotated_image} alt="result" style={{ width: "100%" }} />
            </div>
          )}

          {chartResult.detections.length > 0 && (
            <table>
              <thead>
                <tr><th>{t.detPattern}</th><th>{t.confidence}</th><th>{t.signal}</th></tr>
              </thead>
              <tbody>
                {chartResult.detections.map((d, i) => (
                  <tr key={i}>
                    <td>{d.pattern}</td>
                    <td>{(d.confidence * 100).toFixed(1)}%</td>
                    <td className={signalClass(d.signal)}>{lang === "ko" ? d.signal_ko : d.signal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {chartResult.vision_analysis && (
            <div className="border-box" style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{t.visionTitle}</div>
              {chartResult.vision_analysis}
            </div>
          )}
        </>
      )}

      <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "20px 0" }} />

      {/* === Section 2: Ask === */}
      <h2 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 8 }}>{t.askTitle}</h2>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
        {t.askDesc}
        {chartResult && chartResult.detections.length > 0 && (
          <span style={{ color: "#333" }}>{t.chartReflected}</span>
        )}
      </p>

      <form onSubmit={handleAsk}>
        <table style={{ marginBottom: 8 }}>
          <tbody>
            <tr>
              <th style={{ width: 100 }}>{t.tickerLabel}</th>
              <td>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder={t.tickerPh}
                />
              </td>
            </tr>
            <tr>
              <th>{t.questionLabel}</th>
              <td>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t.questionPh}
                />
              </td>
            </tr>
          </tbody>
        </table>
        <button
          type="submit"
          disabled={askLoading || (!ticker.trim() && !question.trim())}
          className="btn"
          style={{ width: "100%" }}
        >
          {askLoading ? t.loading : t.submit}
        </button>
      </form>

      {/* Answer */}
      {askResult && (
        <div className="border-box" style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
            {t.result}
            {askResult.source === "basic" && (
              <span style={{ color: "#c62828", marginLeft: 8 }}>{t.noApi}</span>
            )}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {askResult.answer}
          </div>
        </div>
      )}

      {/* Ad */}
      <div style={{ margin: "24px 0", textAlign: "center", border: "1px solid #eee", padding: 16, color: "#ccc", fontSize: 12 }}>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ""}
          data-ad-slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT || ""}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>

      {/* Open source notice */}
      <div style={{ border: "1px solid #eee", padding: "10px 12px", marginTop: 16, fontSize: 11, color: "#999", lineHeight: 1.7 }}>
        {t.opensource}{" "}
        <a href="https://github.com/yeodonghyeon1/predict_stock" target="_blank" rel="noopener noreferrer" style={{ color: "#666" }}>
          {t.opensourceLink}
        </a>
        {t.opensourceEnd}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginTop: 12 }}>
        <p>
          Stock AI | {new Date().getFullYear()} |{" "}
          <a href="https://github.com/yeodonghyeon1/predict_stock" target="_blank" rel="noopener noreferrer" style={{ color: "#aaa" }}>
            GitHub
          </a>
          {" | "}
          <a href="mailto:suggest@predict-stock.com" style={{ color: "#aaa" }}>
            suggest@predict-stock.com
          </a>
        </p>
      </div>
    </div>
  );
}
