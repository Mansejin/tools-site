#!/usr/bin/env node
/**
 * Provision Cloudflare Tunnel for ticket-queue-api (API-only, no dashboard click).
 *
 * One-time Cursor/NAS secrets:
 *   CLOUDFLARE_API_TOKEN   — Account: Cloudflare Tunnel Edit, Zone: DNS Edit
 *   CLOUDFLARE_ACCOUNT_ID  — optional if token can list accounts
 *   CLOUDFLARE_ZONE_ID     — optional; looked up from CF_ZONE_NAME
 *
 * Optional:
 *   CF_ZONE_NAME=mansejin.com
 *   CF_HOSTNAME=ticket-queue-api.mansejin.com
 *   CF_TUNNEL_NAME=ticket-queue-api-nas
 *   CF_ORIGIN_SERVICE=http://api:8787
 *
 * Usage:
 *   node scripts/provision-cloudflare-tunnel.mjs
 *   node scripts/provision-cloudflare-tunnel.mjs --write-env /path/to/.env
 *   node scripts/provision-cloudflare-tunnel.mjs --write-env ./.env --print-token
 *
 * Does NOT print the full token unless --print-token is passed.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const getArgValue = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
};

const API = "https://api.cloudflare.com/client/v4";
const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
if (!token) {
  console.error("Missing CLOUDFLARE_API_TOKEN (or CF_API_TOKEN).");
  console.error("Create at https://dash.cloudflare.com/profile/api-tokens");
  console.error("Permissions: Account → Cloudflare Tunnel → Edit, Zone → DNS → Edit");
  process.exit(1);
}

const zoneName = process.env.CF_ZONE_NAME || "mansejin.com";
const hostname = process.env.CF_HOSTNAME || `ticket-queue-api.${zoneName}`;
const tunnelName = process.env.CF_TUNNEL_NAME || "ticket-queue-api-nas";
const originService = process.env.CF_ORIGIN_SERVICE || "http://api:8787";
const writeEnvPath = getArgValue("--write-env");
const printToken = args.has("--print-token");

async function cf(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const msg = JSON.stringify(data.errors || data, null, 2);
    throw new Error(`${method} ${path} failed (${res.status}): ${msg}`);
  }
  return data.result;
}

async function resolveAccountId() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID) {
    return process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
  }
  const accounts = await cf("GET", "/accounts?per_page=50");
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("No Cloudflare accounts visible to this token; set CLOUDFLARE_ACCOUNT_ID");
  }
  if (accounts.length > 1) {
    console.error("Multiple accounts; set CLOUDFLARE_ACCOUNT_ID explicitly:");
    for (const a of accounts) console.error(`  ${a.id}  ${a.name}`);
    process.exit(1);
  }
  return accounts[0].id;
}

async function resolveZoneId() {
  if (process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID) {
    return process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID;
  }
  const zones = await cf("GET", `/zones?name=${encodeURIComponent(zoneName)}`);
  if (!Array.isArray(zones) || zones.length === 0) {
    throw new Error(`Zone not found for ${zoneName}; set CLOUDFLARE_ZONE_ID`);
  }
  return zones[0].id;
}

function upsertEnv(filePath, key, value) {
  const abs = resolve(filePath);
  let text = existsSync(abs) ? readFileSync(abs, "utf8") : "";
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) text = text.replace(re, line);
  else text = `${text.replace(/\s*$/, "")}\n${line}\n`;
  writeFileSync(abs, text, { mode: 0o600 });
  console.log(`Wrote ${key} to ${abs}`);
}

async function main() {
  console.log(`Provisioning tunnel "${tunnelName}" → ${hostname} → ${originService}`);

  const accountId = await resolveAccountId();
  const zoneId = await resolveZoneId();
  console.log(`account=${accountId.slice(0, 8)}… zone=${zoneId.slice(0, 8)}…`);

  const tunnels = await cf("GET", `/accounts/${accountId}/cfd_tunnel?is_deleted=false&per_page=100`);
  let tunnel = (tunnels || []).find((t) => t.name === tunnelName && !t.deleted_at);

  let tunnelToken;
  if (tunnel) {
    console.log(`Reusing tunnel id=${tunnel.id}`);
    tunnelToken = await cf("GET", `/accounts/${accountId}/cfd_tunnel/${tunnel.id}/token`);
    // token endpoint may return a string result
    if (tunnelToken && typeof tunnelToken === "object" && tunnelToken.token) {
      tunnelToken = tunnelToken.token;
    }
  } else {
    console.log("Creating tunnel…");
    tunnel = await cf("POST", `/accounts/${accountId}/cfd_tunnel`, {
      name: tunnelName,
      config_src: "cloudflare",
    });
    tunnelToken = tunnel.token;
    if (!tunnelToken) {
      tunnelToken = await cf("GET", `/accounts/${accountId}/cfd_tunnel/${tunnel.id}/token`);
      if (tunnelToken && typeof tunnelToken === "object" && tunnelToken.token) {
        tunnelToken = tunnelToken.token;
      }
    }
    console.log(`Created tunnel id=${tunnel.id}`);
  }

  if (!tunnelToken || typeof tunnelToken !== "string") {
    throw new Error("Could not obtain tunnel token from Cloudflare API");
  }

  console.log("Updating ingress config…");
  await cf("PUT", `/accounts/${accountId}/cfd_tunnel/${tunnel.id}/configurations`, {
    config: {
      ingress: [
        { hostname, service: originService, originRequest: {} },
        { service: "http_status:404" },
      ],
    },
  });

  const cnameTarget = `${tunnel.id}.cfargotunnel.com`;
  const records = await cf(
    "GET",
    `/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(hostname)}`
  );
  const existing = (records || [])[0];
  if (existing) {
    if (existing.content !== cnameTarget || !existing.proxied) {
      console.log(`Updating DNS CNAME ${hostname} → ${cnameTarget}`);
      await cf("PUT", `/zones/${zoneId}/dns_records/${existing.id}`, {
        type: "CNAME",
        name: hostname,
        content: cnameTarget,
        proxied: true,
      });
    } else {
      console.log(`DNS already OK: ${hostname} → ${cnameTarget} (proxied)`);
    }
  } else {
    console.log(`Creating DNS CNAME ${hostname} → ${cnameTarget}`);
    await cf("POST", `/zones/${zoneId}/dns_records`, {
      type: "CNAME",
      name: hostname,
      content: cnameTarget,
      proxied: true,
    });
  }

  if (writeEnvPath) {
    upsertEnv(writeEnvPath, "CLOUDFLARE_TUNNEL_TOKEN", tunnelToken);
  }

  console.log("");
  console.log("Done.");
  console.log(`  Public URL: https://${hostname}/health`);
  console.log(`  Tunnel:     ${tunnelName} (${tunnel.id})`);
  console.log(`  Origin:     ${originService}`);
  if (printToken) {
    console.log(`  Token:      ${tunnelToken}`);
  } else {
    console.log("  Token:      (hidden — pass --print-token or --write-env)");
  }
  console.log("");
  console.log("NAS bring-up:");
  console.log("  cd /volume1/docker/tools-site/ticket-queue-api");
  console.log("  # ensure CLOUDFLARE_TUNNEL_TOKEN in .env");
  console.log("  docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
