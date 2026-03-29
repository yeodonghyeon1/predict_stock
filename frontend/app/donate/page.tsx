"use client";

import Link from "next/link";

export default function DonatePage() {
  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40, maxWidth: 600 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ fontSize: 12, color: "#888" }}>← 메인으로</Link>
      </div>

      <h1 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>후원</h1>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
        서버 운영비(전기, GPU)와 서비스 개선에 사용됩니다.
      </p>

      <table>
        <thead>
          <tr>
            <th>방법</th>
            <th>정보</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>계좌이체</td>
            <td>토스뱅크 1001-8776-7305</td>
          </tr>
          <tr>
            <td>카카오페이</td>
            <td>아래 QR 코드</td>
          </tr>
          <tr>
            <td>BTC</td>
            <td style={{ fontSize: 11, color: "#aaa" }}>준비중</td>
          </tr>
          <tr>
            <td>ETH</td>
            <td style={{ fontSize: 11, color: "#aaa" }}>준비중</td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>카카오페이 송금 QR</p>
        <img
          src="/kakaopay-qr.png"
          alt="카카오페이 QR"
          style={{ maxWidth: 240, border: "1px solid #ddd" }}
        />
      </div>

      <p style={{ fontSize: 11, color: "#aaa", marginTop: 16, textAlign: "center" }}>
        감사합니다.
      </p>
    </div>
  );
}
