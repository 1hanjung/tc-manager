"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type TestResult = {
  success: boolean;
  fileName: string;
  filePath: string;
  summary: {
    url: string;
    title: string;
    statusCode: number;
    loadTime: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: {
    passed: string[];
    failed: string[];
    warnings: string[];
  };
  consoleErrors: string[];
  brokenLinks: { url: string; status: number; ok: boolean }[];
};

export default function UrlTestPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState("");

  const handleTest = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.startsWith("http") ? url : `https://${url}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "테스트 실패");
      setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="border-b px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← TC Manager
        </Link>
        <h1 className="font-bold text-lg">🔍 URL 자동 테스트</h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* URL 입력 */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">
              테스트할 URL을 입력하고 실행하면 자동으로 QA 테스트 후 바탕화면에 결과를 저장합니다.
            </p>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => e.key === "Enter" && handleTest()}
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={handleTest} disabled={loading || !url.trim()} className="min-w-[120px]">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    테스트 중...
                  </span>
                ) : (
                  "테스트 실행"
                )}
              </Button>
            </div>
            {loading && (
              <p className="text-xs text-muted-foreground mt-3 animate-pulse">
                ⏳ 페이지를 분석하고 있습니다. 잠시만 기다려주세요...
              </p>
            )}
          </CardContent>
        </Card>

        {/* 에러 */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">❌ {error}</p>
            </CardContent>
          </Card>
        )}

        {/* 결과 */}
        {result && (
          <>
            {/* 저장 알림 */}
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6 text-sm text-green-800">
              ✅ 결과가 바탕화면에 저장되었습니다: <strong>{result.fileName}</strong>
            </div>

            {/* 요약 카드 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">통과</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{result.summary.passed}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">실패</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">{result.summary.failed}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">경고</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yellow-500">{result.summary.warnings}</p>
                </CardContent>
              </Card>
            </div>

            {/* 기본 정보 */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">📊 기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">페이지 제목</span>
                  <span className="font-medium">{result.summary.title || "(없음)"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HTTP 상태 코드</span>
                  <Badge variant={result.summary.statusCode >= 200 && result.summary.statusCode < 300 ? "default" : "destructive"}>
                    {result.summary.statusCode}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">로드 시간</span>
                  <span className={`font-medium ${result.summary.loadTime < 3000 ? "text-green-600" : result.summary.loadTime < 6000 ? "text-yellow-500" : "text-red-600"}`}>
                    {(result.summary.loadTime / 1000).toFixed(2)}초
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 테스트 항목 */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">🧪 테스트 항목</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {result.results.passed.map((p, i) => (
                  <div key={i} className="py-1 border-b border-muted last:border-0">{p}</div>
                ))}
                {result.results.failed.map((f, i) => (
                  <div key={i} className="py-1 border-b border-muted last:border-0 text-red-600">{f}</div>
                ))}
                {result.results.warnings.map((w, i) => (
                  <div key={i} className="py-1 border-b border-muted last:border-0 text-yellow-600">{w}</div>
                ))}
              </CardContent>
            </Card>

            {/* 콘솔 에러 */}
            {result.consoleErrors.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-base text-red-600">
                    🚨 콘솔 에러 ({result.consoleErrors.length}건)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {result.consoleErrors.map((e, i) => (
                    <div key={i} className="text-xs font-mono bg-red-50 text-red-700 px-3 py-2 rounded">
                      {e}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 깨진 링크 */}
            {result.brokenLinks.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-base text-red-600">
                    🔗 깨진 링크 ({result.brokenLinks.length}건)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {result.brokenLinks.map((l, i) => (
                    <div key={i} className="text-xs bg-red-50 text-red-700 px-3 py-2 rounded flex justify-between">
                      <span className="truncate">{l.url}</span>
                      <span className="ml-2 font-bold">{l.status || "실패"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
