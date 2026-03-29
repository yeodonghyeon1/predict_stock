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
            <td>카카오뱅크 3333-XX-XXXXXXX (홍길동)</td>
          </tr>
          <tr>
            <td>카카오페이</td>
            <td>송금 링크 (준비중)</td>
          </tr>
          <tr>
            <td>BTC</td>
            <td style={{ fontSize: 11, wordBreak: "break-all" }}>bc1q...</td>
          </tr>
          <tr>
            <td>ETH</td>
            <td style={{ fontSize: 11, wordBreak: "break-all" }}>0x...</td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 11, color: "#aaa", marginTop: 16, textAlign: "center" }}>
        감사합니다.
      </p>
    </div>
  );
}
