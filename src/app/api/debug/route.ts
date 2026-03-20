import { NextResponse } from "next/server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

export async function GET() {
  const home = os.homedir();
  const msPlaywrightPath = path.join(home, "AppData", "Local", "ms-playwright");

  let dirContents: string[] = [];
  try {
    dirContents = fs.readdirSync(msPlaywrightPath);
  } catch (e) {
    dirContents = [`ERROR: ${String(e)}`];
  }

  const chromiumPath = path.join(home, "AppData", "Local", "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe");

  const cwd = process.cwd();
  const scriptPath = path.join(cwd, "scripts", "run-test.js");
  const browsersPath = path.join(cwd, "browsers");

  return NextResponse.json({
    cwd,
    home,
    scriptPath,
    scriptExists: fs.existsSync(scriptPath),
    browsersPath,
    browsersExists: fs.existsSync(browsersPath),
    msPlaywrightPath,
    msPlaywrightExists: fs.existsSync(msPlaywrightPath),
    dirContents,
    chromiumPath,
    chromiumExists: fs.existsSync(chromiumPath),
  });
}
