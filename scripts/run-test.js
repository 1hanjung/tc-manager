// Next.js 외부에서 독립적으로 실행되는 Playwright 테스트 스크립트
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const os = require("os");

async function runTest(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const failedRequests = [];
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });

  const startTime = Date.now();
  let statusCode = 0;
  let errorMessage = "";

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    statusCode = response?.status() ?? 0;
    await page.waitForTimeout(2000);
  } catch (e) {
    errorMessage = String(e);
  }

  const loadTime = Date.now() - startTime;
  const title = await page.title().catch(() => "");

  const screenshotBuffer = await page.screenshot({ fullPage: false }).catch(() => null);
  const screenshotBase64 = screenshotBuffer
    ? `data:image/png;base64,${screenshotBuffer.toString("base64")}`
    : null;

  const brokenImages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("img"))
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.src);
  }).catch(() => []);

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map((a) => a.href)
      .filter((href) => href.startsWith("http"))
      .slice(0, 10);
  }).catch(() => []);

  // 링크 병렬 검사
  const linkResults = [];
  if (links.length > 0) {
    const results = await Promise.allSettled(
      links.map((link) =>
        page.request.get(link, { timeout: 5000 }).then((res) => ({
          url: link,
          status: res.status(),
          ok: res.ok(),
        }))
      )
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") linkResults.push(r.value);
      else linkResults.push({ url: links[i], status: 0, ok: false });
    }
  }
  const brokenLinks = linkResults.filter((l) => !l.ok);

  const a11y = await page.evaluate(() => ({
    hasH1: document.querySelectorAll("h1").length > 0,
    imgsWithoutAlt: Array.from(document.querySelectorAll("img"))
      .filter((img) => !img.alt)
      .map((img) => img.src)
      .slice(0, 5),
    hasLang: !!document.documentElement.lang,
    metaViewport: !!document.querySelector('meta[name="viewport"]'),
    metaDescription: !!document.querySelector('meta[name="description"]'),
  })).catch(() => null);

  // 동영상 / 오디오 / 캔버스(게임) 요소 검사
  const mediaInfo = await page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll("video"));
    const audios = Array.from(document.querySelectorAll("audio"));
    const canvases = Array.from(document.querySelectorAll("canvas"));
    const iframes = Array.from(document.querySelectorAll("iframe"));
    return {
      videoCount: videos.length,
      videosWithSrc: videos.filter((v) => v.src || v.querySelector("source")).length,
      videosWithError: videos.filter((v) => v.error !== null).length,
      audioCount: audios.length,
      audiosWithError: audios.filter((a) => a.error !== null).length,
      canvasCount: canvases.length,
      canvasWithSize: canvases.filter((c) => c.width > 0 && c.height > 0).length,
      iframeCount: iframes.length,
      iframeSrcs: iframes.map((f) => f.src).filter(Boolean).slice(0, 5),
    };
  }).catch(() => null);

  // 동영상 play() 실행 가능 여부 확인 (최대 3개, 타임아웃 3초)
  const videoPlayResults = mediaInfo && mediaInfo.videoCount > 0
    ? await page.evaluate(async () => {
        const videos = Array.from(document.querySelectorAll("video"));
        const results = [];
        for (let i = 0; i < Math.min(videos.length, 3); i++) {
          const v = videos[i];
          try {
            // 3초 타임아웃 적용
            const playPromise = v.play();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("재생 타임아웃 (3초)")), 3000)
            );
            await Promise.race([playPromise, timeoutPromise]);
            v.pause();
            results.push({ index: i + 1, playable: true, error: null });
          } catch (e) {
            results.push({ index: i + 1, playable: false, error: e.message });
          }
        }
        return results;
      }).catch(() => [])
    : [];

  await browser.close();

  // 결과 집계
  const passed = [], failed = [], warnings = [];

  if (statusCode >= 200 && statusCode < 300) {
    passed.push(`✅ HTTP 응답 코드 정상 (${statusCode})`);
  } else if (statusCode === 0 && errorMessage) {
    failed.push(`❌ 페이지 로드 실패: ${errorMessage.slice(0, 100)}`);
  } else {
    failed.push(`❌ HTTP 응답 코드 비정상 (${statusCode})`);
  }

  if (loadTime < 3000) passed.push(`✅ 페이지 로드 시간 양호 (${(loadTime / 1000).toFixed(2)}초)`);
  else if (loadTime < 6000) warnings.push(`⚠️ 페이지 로드 시간 느림 (${(loadTime / 1000).toFixed(2)}초)`);
  else failed.push(`❌ 페이지 로드 시간 너무 느림 (${(loadTime / 1000).toFixed(2)}초)`);

  if (consoleErrors.length === 0) passed.push("✅ 콘솔 에러 없음");
  else failed.push(`❌ 콘솔 에러 ${consoleErrors.length}건`);

  if (brokenImages.length === 0) passed.push("✅ 깨진 이미지 없음");
  else failed.push(`❌ 깨진 이미지 ${brokenImages.length}건`);

  if (brokenLinks.length === 0) passed.push(`✅ 깨진 링크 없음 (${linkResults.length}개 확인)`);
  else failed.push(`❌ 깨진 링크 ${brokenLinks.length}건`);

  if (failedRequests.length === 0) passed.push("✅ 네트워크 요청 실패 없음");
  else warnings.push(`⚠️ 네트워크 요청 실패 ${failedRequests.length}건`);

  if (a11y) {
    if (a11y.hasH1) passed.push("✅ H1 태그 존재"); else warnings.push("⚠️ H1 태그 없음");
    if (a11y.hasLang) passed.push("✅ lang 속성 존재"); else warnings.push("⚠️ HTML lang 속성 없음");
    if (a11y.metaViewport) passed.push("✅ viewport 메타태그 존재"); else warnings.push("⚠️ viewport 메타태그 없음");
    if (a11y.metaDescription) passed.push("✅ meta description 존재"); else warnings.push("⚠️ meta description 없음");
    if (a11y.imgsWithoutAlt.length === 0) passed.push("✅ 모든 이미지에 alt 속성 존재");
    else warnings.push(`⚠️ alt 속성 없는 이미지 ${a11y.imgsWithoutAlt.length}건`);
  }

  // 동영상 테스트 결과 집계
  if (mediaInfo) {
    if (mediaInfo.videoCount === 0) {
      warnings.push("ℹ️ 동영상 요소 없음 (페이지에 <video> 태그 없음)");
    } else {
      passed.push(`✅ 동영상 요소 감지됨 (${mediaInfo.videoCount}개)`);
      if (mediaInfo.videosWithSrc > 0) passed.push(`✅ 동영상 소스 연결됨 (${mediaInfo.videosWithSrc}개)`);
      else failed.push("❌ 동영상 소스(src) 없음");
      if (mediaInfo.videosWithError > 0) failed.push(`❌ 동영상 로드 에러 (${mediaInfo.videosWithError}개)`);
      else passed.push("✅ 동영상 로드 에러 없음");
    }

    // play() 결과
    if (videoPlayResults.length > 0) {
      const playable = videoPlayResults.filter((r) => r.playable).length;
      const notPlayable = videoPlayResults.filter((r) => !r.playable).length;
      if (notPlayable === 0) passed.push(`✅ 동영상 재생(play) 가능 (${playable}개 확인)`);
      else warnings.push(`⚠️ 동영상 재생 불가 ${notPlayable}건 (자동재생 정책 또는 소스 없음)`);
    }

    // 오디오 테스트
    if (mediaInfo.audioCount === 0) {
      warnings.push("ℹ️ 오디오 요소 없음 (페이지에 <audio> 태그 없음)");
    } else {
      passed.push(`✅ 오디오 요소 감지됨 (${mediaInfo.audioCount}개)`);
      if (mediaInfo.audiosWithError > 0) failed.push(`❌ 오디오 로드 에러 (${mediaInfo.audiosWithError}개)`);
      else passed.push("✅ 오디오 로드 에러 없음");
    }

    // 캔버스(게임) 테스트
    if (mediaInfo.canvasCount === 0) {
      warnings.push("ℹ️ 캔버스 요소 없음 (게임/인터랙티브 콘텐츠 없음)");
    } else {
      passed.push(`✅ 캔버스 요소 감지됨 (${mediaInfo.canvasCount}개)`);
      if (mediaInfo.canvasWithSize > 0) passed.push(`✅ 캔버스 렌더링 크기 정상 (${mediaInfo.canvasWithSize}개)`);
      else failed.push("❌ 캔버스 크기가 0 (렌더링 실패 가능성)");
    }

    // iframe (임베디드 동영상 - YouTube 등)
    if (mediaInfo.iframeCount > 0) {
      warnings.push(`ℹ️ iframe 감지됨 (${mediaInfo.iframeCount}개) - 임베디드 콘텐츠는 내부 테스트 불가`);
    }
  }

  const testedAt = new Date().toLocaleString("ko-KR");
  const fileName = `QA_결과_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.html`;
  // 바탕화면 경로: 일반 또는 OneDrive 위치 자동 감지
  const home = os.homedir();
  const desktopPaths = [
    path.join(home, "Desktop"),
    path.join(home, "OneDrive", "Desktop"),
    path.join(home, "OneDrive - Personal", "Desktop"),
  ];
  const desktopPath = desktopPaths.find((p) => fs.existsSync(p)) || desktopPaths[0];
  const filePath = path.join(desktopPath, fileName);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>QA 테스트 결과 - ${url}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #f4f6f9; color: #222; }
    .container { max-width: 960px; margin: 40px auto; padding: 0 20px 60px; }
    .header { background: linear-gradient(135deg, #1e3a5f, #2d6a9f); color: white; padding: 32px 36px; border-radius: 12px; margin-bottom: 28px; }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { font-size: 14px; opacity: 0.85; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .summary-card { background: white; border-radius: 10px; padding: 20px 24px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
    .summary-card .count { font-size: 36px; font-weight: 700; margin-bottom: 4px; }
    .summary-card .label { font-size: 13px; color: #666; }
    .pass-count { color: #22c55e; } .fail-count { color: #ef4444; } .warn-count { color: #f59e0b; }
    .section { background: white; border-radius: 10px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
    .section h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
    .result-item { font-size: 14px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
    .result-item:last-child { border-bottom: none; }
    .meta-row { display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #666; } .meta-value { font-weight: 500; }
    .screenshot { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 12px; }
    .link-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    .link-table th { text-align: left; padding: 8px 12px; background: #f9fafb; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
    .link-table td { padding: 7px 12px; border-bottom: 1px solid #f3f4f6; word-break: break-all; }
    .status-ok { color: #16a34a; font-weight: 600; } .status-fail { color: #dc2626; font-weight: 600; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 32px; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🔍 QA 테스트 결과 리포트</h1>
    <p>대상 URL: <strong>${url}</strong></p>
    <p>페이지 제목: ${title || "(없음)"} &nbsp;|&nbsp; 테스트 일시: ${testedAt}</p>
  </div>
  <div class="summary-grid">
    <div class="summary-card"><div class="count pass-count">${passed.length}</div><div class="label">통과 항목</div></div>
    <div class="summary-card"><div class="count fail-count">${failed.length}</div><div class="label">실패 항목</div></div>
    <div class="summary-card"><div class="count warn-count">${warnings.length}</div><div class="label">경고 항목</div></div>
  </div>
  <div class="section">
    <h2>📊 기본 정보</h2>
    <div class="meta-row"><span class="meta-label">URL</span><span class="meta-value">${url}</span></div>
    <div class="meta-row"><span class="meta-label">HTTP 상태 코드</span><span class="meta-value">${statusCode}</span></div>
    <div class="meta-row"><span class="meta-label">페이지 로드 시간</span><span class="meta-value">${(loadTime / 1000).toFixed(2)}초</span></div>
    <div class="meta-row"><span class="meta-label">페이지 제목</span><span class="meta-value">${title || "(없음)"}</span></div>
  </div>
  <div class="section">
    <h2>✅ 테스트 결과</h2>
    ${passed.map((p) => `<div class="result-item">${p}</div>`).join("")}
    ${failed.map((f) => `<div class="result-item">${f}</div>`).join("")}
    ${warnings.map((w) => `<div class="result-item">${w}</div>`).join("")}
  </div>
  ${consoleErrors.length > 0 ? `<div class="section"><h2>🚨 콘솔 에러 (${consoleErrors.length}건)</h2>${consoleErrors.map((e) => `<div class="result-item" style="color:#dc2626;font-family:monospace;font-size:12px">${e}</div>`).join("")}</div>` : ""}
  ${brokenLinks.length > 0 ? `<div class="section"><h2>🔗 깨진 링크 (${brokenLinks.length}건)</h2><table class="link-table"><thead><tr><th>URL</th><th>상태</th></tr></thead><tbody>${brokenLinks.map((l) => `<tr><td>${l.url}</td><td class="status-fail">${l.status || "연결 실패"}</td></tr>`).join("")}</tbody></table></div>` : ""}
  ${linkResults.length > 0 ? `<div class="section"><h2>🔗 전체 링크 검사 (${linkResults.length}건)</h2><table class="link-table"><thead><tr><th>URL</th><th>상태 코드</th><th>결과</th></tr></thead><tbody>${linkResults.map((l) => `<tr><td>${l.url}</td><td>${l.status || "-"}</td><td class="${l.ok ? "status-ok" : "status-fail"}">${l.ok ? "정상" : "실패"}</td></tr>`).join("")}</tbody></table></div>` : ""}
  ${mediaInfo && (mediaInfo.videoCount > 0 || mediaInfo.audioCount > 0 || mediaInfo.canvasCount > 0 || mediaInfo.iframeCount > 0) ? `
  <div class="section">
    <h2>🎬 미디어 / 게임 요소 검사</h2>
    <div class="meta-row"><span class="meta-label">동영상(&lt;video&gt;)</span><span class="meta-value">${mediaInfo.videoCount}개 감지${mediaInfo.videosWithError > 0 ? ` / ❌ 에러 ${mediaInfo.videosWithError}건` : ""}</span></div>
    ${videoPlayResults.length > 0 ? `<div class="meta-row"><span class="meta-label">동영상 재생(play()) 테스트</span><span class="meta-value">${videoPlayResults.map((r) => `#${r.index}: ${r.playable ? "✅ 재생 가능" : `⚠️ 재생 불가 (${r.error})`}`).join(" | ")}</span></div>` : ""}
    <div class="meta-row"><span class="meta-label">오디오(&lt;audio&gt;)</span><span class="meta-value">${mediaInfo.audioCount}개 감지${mediaInfo.audiosWithError > 0 ? ` / ❌ 에러 ${mediaInfo.audiosWithError}건` : ""}</span></div>
    <div class="meta-row"><span class="meta-label">캔버스(&lt;canvas&gt;, 게임)</span><span class="meta-value">${mediaInfo.canvasCount}개 감지 / 크기 정상 ${mediaInfo.canvasWithSize}개</span></div>
    <div class="meta-row"><span class="meta-label">iframe(임베디드)</span><span class="meta-value">${mediaInfo.iframeCount}개 감지 (내부 테스트 불가)</span></div>
    ${mediaInfo.iframeSrcs.length > 0 ? `<div class="meta-row"><span class="meta-label">iframe 소스</span><span class="meta-value" style="font-size:12px">${mediaInfo.iframeSrcs.join("<br/>")}</span></div>` : ""}
  </div>` : ""}
  ${screenshotBase64 ? `<div class="section"><h2>📸 페이지 스크린샷</h2><img class="screenshot" src="${screenshotBase64}" alt="스크린샷" /></div>` : ""}
  <div class="footer">TC Manager - QA 자동 테스트 리포트 | ${testedAt}</div>
</div>
</body>
</html>`;

  fs.writeFileSync(filePath, html, "utf-8");

  return { success: true, fileName, filePath, summary: { url, title, statusCode, loadTime, passed: passed.length, failed: failed.length, warnings: warnings.length }, results: { passed, failed, warnings }, consoleErrors, brokenLinks, linkResults };
}

// 커맨드라인 인수로 URL 받아서 실행
const url = process.argv[2];
if (!url) {
  console.log(JSON.stringify({ error: "URL이 필요합니다." }));
  process.exit(1);
}

runTest(url)
  .then((result) => {
    console.log(JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.log(JSON.stringify({ error: String(err) }));
    process.exit(1);
  });
