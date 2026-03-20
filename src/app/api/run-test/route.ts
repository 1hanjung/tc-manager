import { NextResponse } from "next/server";
import { spawn } from "child_process";
import * as path from "path";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), "scripts", "run-test.js");
    const targetUrl = url.startsWith("http") ? url : `https://${url}`;

    // 별도 Node.js 프로세스로 Playwright 실행 (Next.js 환경 제한 우회)
    const result = await new Promise<string>((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      const browsersPath = path.join(process.cwd(), "browsers");
      const child = spawn(process.execPath, [scriptPath, targetUrl], {
        timeout: 110000,
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSERS_PATH: browsersPath,
        },
      });

      child.stdout.on("data", (data) => { stdout += data.toString(); });
      child.stderr.on("data", (data) => { stderr += data.toString(); });

      child.on("close", (code) => {
        if (code === 0 && stdout) resolve(stdout.trim());
        else reject(new Error(stderr || stdout || `프로세스 종료 코드: ${code}`));
      });

      child.on("error", (err) => reject(err));
    });

    const data = JSON.parse(result);

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("테스트 실행 오류:", err);
    return NextResponse.json(
      { error: `테스트 실행 중 오류: ${String(err).slice(0, 300)}` },
      { status: 500 }
    );
  }
}
