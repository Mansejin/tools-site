import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { config } from "./config.js";

function requireCreds() {
  const { clientId, clientSecret, refreshToken } = config.youtube;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "YouTube OAuth 미설정: YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN 필요 (npm run auth)"
    );
  }
  return { clientId, clientSecret, refreshToken };
}

export function createYoutubeClient() {
  const { clientId, clientSecret, refreshToken } = requireCreds();
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.youtube({ version: "v3", auth: oauth2 });
}

function applyTemplate(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : ""
  );
}

export function buildMetadata(filePath) {
  const filename = path.basename(filePath);
  const name = filename.replace(/\.[^.]+$/, "");
  const uploadedAt = new Date().toISOString();
  const vars = { name, filename, uploadedAt };
  return {
    snippet: {
      title: applyTemplate(config.titleTemplate, vars).slice(0, 100),
      description: applyTemplate(config.descriptionTemplate, vars),
      tags: config.tags,
      categoryId: config.categoryId,
    },
    status: {
      privacyStatus: config.privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };
}

/**
 * Resumable upload. Returns { videoId, url }.
 */
export async function uploadVideo(filePath, onProgress) {
  const youtube = createYoutubeClient();
  const meta = buildMetadata(filePath);
  const size = fs.statSync(filePath).size;
  const stream = fs.createReadStream(filePath);

  const res = await youtube.videos.insert(
    {
      part: ["snippet", "status"],
      requestBody: meta,
      media: {
        body: stream,
      },
    },
    {
      onUploadProgress: (evt) => {
        if (!onProgress || !evt.bytesRead) return;
        onProgress({
          bytesRead: evt.bytesRead,
          total: size,
          pct: Math.min(100, Math.round((evt.bytesRead / size) * 100)),
        });
      },
    }
  );

  const videoId = res.data.id;
  if (!videoId) throw new Error("YouTube upload 응답에 videoId 없음");

  if (config.playlistId) {
    try {
      await youtube.playlistItems.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            playlistId: config.playlistId,
            resourceId: {
              kind: "youtube#video",
              videoId,
            },
          },
        },
      });
    } catch (err) {
      console.warn("[siyan] playlist 추가 실패 (영상은 업로드됨):", err.message);
    }
  }

  return {
    videoId,
    url: `https://youtu.be/${videoId}`,
    title: res.data.snippet?.title || meta.snippet.title,
    privacyStatus: res.data.status?.privacyStatus || config.privacyStatus,
  };
}
