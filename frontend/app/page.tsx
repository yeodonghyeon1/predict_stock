"use client";

import { useState, useCallback } from "react";

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
}

interface ToneData {
  sentiment: string;
  signal_ko: string;
}

interface NewsItem {
  title_original: string;
  link: string;
  source: string;
  sentiment: ToneData;
}

interface NewsResult {
  query: string;
  news: NewsItem[];
  summary: {
    signal: string;
    signal_ko: string;
    total_articles: number;
    positive_count: number;
    neutral_count: number;
    negative_count: number;
  };
}

interface SentimentResult {
  sentiment: string;
  confidence: number;
  scores: { negative: number; neutral: number; positive: number };
  signal: string;
  signal_ko: string;
}

export default function Home() {
  const [chartResult, setChartResult] = useState<ChartResult | null>(null);
  const [newsResult, setNewsResult] = useState<NewsResult | null>(null);
  const [sentimentResult, setSentimentResult] = useState<SentimentResult | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [ticker, setTicker] = useState("");
  const [question, setQuestion] = useState("");

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setFileName(file.name);
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

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() && !question.trim()) return;
    setNewsLoading(true);
    setNewsResult(null);
    setSentimentResult(null);

    try {
      const promises: Promise<void>[] = [];

      if (ticker.trim()) {
        promises.push(
          fetch("/api/analyze-stock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: ticker.trim() }),
          })
            .then((r) => r.json())
            .then((data) => setNewsResult(data))
        );
      }

      if (question.trim()) {
        promises.push(
          fetch("/api/analyze-sentiment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: question.trim() }),
          })
            .then((r) => r.json())
            .then((data) => setSentimentResult(data))
        );
      }

      await Promise.all(promises);
    } catch {
      // ignore
    } finally {
      setNewsLoading(false);
    }
  };

  const signalClass = (s: string) =>
    s === "Buy" ? "signal-buy" : s === "Sell" ? "signal-sell" : "signal-hold";

  const toneColor = (s: string) =>
    s === "positive" ? "#d32f2f" : s === "negative" ? "#1565c0" : "#666";

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 18, fontWeight: "bold", margin: 0 }}>Stock AI 분석</h1>
        <a href="/donate" style={{ fontSize: 12, color: "#888" }}>후원</a>
      </div>

      {/* Warning */}
      <div style={{ background: "#fff8e1", border: "1px solid #ffe082", padding: "8px 12px", marginBottom: 16, fontSize: 12, color: "#795548" }}>
        AI 분석 결과를 맹신하지 마십시오. 본 서비스는 참고용이며 투자 판단의 근거가 될 수 없습니다.
        모델의 정확도는 제한적이고, 시장 상황에 따라 결과가 달라질 수 있습니다.
        모든 투자 결정과 그에 따른 손실은 전적으로 이용자 본인의 책임입니다.
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "0 0 16px" }} />

      {/* === Section 1: Chart Upload (Main) === */}
      <h2 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 8 }}>차트 패턴 분석</h2>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
        주식 차트 캡처를 올리면 AI가 패턴(삼중천정, 삼중바닥, M자, W자, 삼각수렴 등)을 감지합니다.
      </p>

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
          {fileName || "클릭 또는 드래그하여 차트 이미지 업로드"}
        </p>
      </div>

      {chartLoading && <p style={{ textAlign: "center", color: "#888", fontSize: 13 }}>차트 분석 중...</p>}

      {chartResult && (
        <>
          <div className="border-box" style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "#888" }}>차트 시그널</span>
            <div className={signalClass(chartResult.primary_signal)} style={{ fontSize: 22, margin: "4px 0" }}>
              {chartResult.primary_signal_ko}
            </div>
            <span style={{ fontSize: 12, color: "#888" }}>{chartResult.pattern_count}개 패턴 감지</span>
          </div>

          {chartResult.annotated_image && (
            <div className="border-box" style={{ padding: 4 }}>
              <img src={chartResult.annotated_image} alt="분석 결과" style={{ width: "100%" }} />
            </div>
          )}

          {chartResult.detections.length > 0 && (
            <table>
              <thead>
                <tr><th>패턴</th><th>신뢰도</th><th>시그널</th></tr>
              </thead>
              <tbody>
                {chartResult.detections.map((d, i) => (
                  <tr key={i}>
                    <td>{d.pattern}</td>
                    <td>{(d.confidence * 100).toFixed(1)}%</td>
                    <td className={signalClass(d.signal)}>{d.signal_ko}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "20px 0" }} />

      {/* === Section 2: Ticker + Question === */}
      <h2 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 8 }}>추가 분석</h2>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
        종목명을 입력하면 최신 뉴스의 분위기를 분석하고, 텍스트를 입력하면 긍정/부정 여부를 판단합니다.
        둘 다 입력하면 동시에 분석합니다.
      </p>

      <form onSubmit={handleAnalyze}>
        <table style={{ marginBottom: 8 }}>
          <tbody>
            <tr>
              <th style={{ width: 100 }}>종목명/티커</th>
              <td>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="예: AAPL, 삼성전자, Tesla"
                />
              </td>
            </tr>
            <tr>
              <th>질문/텍스트</th>
              <td>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="예: 테슬라 실적 발표 후 주가 하락"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <button
          type="submit"
          disabled={newsLoading || (!ticker.trim() && !question.trim())}
          className="btn"
          style={{ width: "100%" }}
        >
          {newsLoading ? "분석 중..." : "분석"}
        </button>
      </form>

      {/* News result */}
      {newsResult && (
        <div style={{ marginTop: 12 }}>
          <div className="border-box" style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "#888" }}>
              [{newsResult.query}] 뉴스 여론 ({newsResult.summary.total_articles}건)
            </span>
            <div className={signalClass(newsResult.summary.signal)} style={{ fontSize: 22, margin: "4px 0" }}>
              {newsResult.summary.signal_ko}
            </div>
            <span style={{ fontSize: 12 }}>
              <span style={{ color: "#d32f2f" }}>긍정 {newsResult.summary.positive_count}</span>
              {" · "}
              <span style={{ color: "#666" }}>중립 {newsResult.summary.neutral_count}</span>
              {" · "}
              <span style={{ color: "#1565c0" }}>부정 {newsResult.summary.negative_count}</span>
            </span>
          </div>

          {newsResult.news.length > 0 && (
            <table>
              <thead>
                <tr><th>뉴스</th><th>출처</th><th>판단</th></tr>
              </thead>
              <tbody>
                {newsResult.news.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: "#333" }}>
                        {item.title_original}
                      </a>
                    </td>
                    <td style={{ fontSize: 12, color: "#888" }}>{item.source}</td>
                    <td style={{ color: toneColor(item.sentiment.sentiment), fontWeight: "bold", fontSize: 12 }}>
                      {item.sentiment.signal_ko}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Sentiment result */}
      {sentimentResult && (
        <div style={{ marginTop: 12 }}>
          <div className="border-box" style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "#888" }}>텍스트 분석</span>
            <div className={signalClass(sentimentResult.signal)} style={{ fontSize: 22, margin: "4px 0" }}>
              {sentimentResult.signal_ko}
            </div>
            <span style={{ fontSize: 12, color: "#888" }}>
              신뢰도 {(sentimentResult.confidence * 100).toFixed(1)}%
            </span>
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
        본 프로젝트는{" "}
        <a href="https://github.com/yeodonghyeon1/predict_stock" target="_blank" rel="noopener noreferrer" style={{ color: "#666" }}>
          오픈소스
        </a>
        로 공개되어 있으며, 누구나 자유롭게 사용·수정·배포할 수 있습니다.
        서비스 운영에 필요한 서버·모델 유지 비용 충당을 위해 광고가 포함되어 있으나,
        그 외 상업적 수익을 목적으로 하지 않습니다.
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginTop: 12 }}>
        <p>YOLOv8 · BERT | {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
