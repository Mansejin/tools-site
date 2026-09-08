/**
 * One-time YouTube OAuth — run on a machine with a browser.
 *
 * Usage:
 *   npm run auth -- --credentials path/to/client_secret.json
 *   # or set YT_CLIENT_SECRET_FILE
 *
 * Logs in as the feedback-channel Google account, prints YT_REFRESH_TOKEN.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { google } from "googleapis";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--credentials" && argv[i + 1]) {
      out.credentials = argv[++i];
    }
  }
  return out;
}

function loadClient(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const block = raw.installed || raw.web;
  if (!block?.client_id || !block?.client_secret) {
    throw new Error(`Invalid OAuth JSON (need installed/web client_id+secret): ${filePath}`);
  }
  return {
    clientId: block.client_id,
    clientSecret: block.client_secret,
    projectId: block.project_id || raw.project_id || "",
  };
}

const args = parseArgs(process.argv.slice(2));
const credPath =
  args.credentials ||
  process.env.YT_CLIENT_SECRET_FILE ||
  path.resolve("credentials/client_secret.json");

if (!fs.existsSync(credPath)) {
  console.error(
    `OAuth JSON 없음: ${credPath}\n` +
      `예: npm run auth -- --credentials "$env:USERPROFILE\\Downloads\\client_secret....json"`
  );
  process.exit(1);
}

const { clientId, clientSecret, projectId } = loadClient(credPath);
const PORT = Number(process.env.AUTH_PORT || 53682);
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
];

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);
const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`);
    if (u.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const code = u.searchParams.get("code");
    if (!code) {
      res.writeHead(400);
      res.end("missing code");
      return;
    }
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h1>OK</h1><p>터미널에 refresh token이 출력됩니다. 이 창을 닫아도 됩니다.</p>"
    );
    console.log("\n=== .env 에 넣을 값 ===\n");
    if (projectId) console.log(`# project: ${projectId}`);
    console.log(`YT_CLIENT_ID=${clientId}`);
    console.log(`YT_CLIENT_SECRET=${clientSecret}`);
    console.log(
      `YT_REFRESH_TOKEN=${tokens.refresh_token || "(없음 — prompt=consent로 재시도)"}`
    );
    console.log("\n======================\n");
    server.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end(String(err.message || err));
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`credentials: ${credPath}`);
  console.log(
    `\n브라우저에서 열어 피드백 채널 Google 계정으로 로그인하세요:\n\n${authUrl}\n`
  );
});
