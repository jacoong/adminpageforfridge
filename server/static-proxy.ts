import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const workspaceRoot = path.resolve(import.meta.dirname, "..");
const distDir = path.resolve(workspaceRoot, "dist", "public");
const indexFile = path.resolve(distDir, "index.html");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function readEnvFromFile(key: string): string | undefined {
  const envPath = path.resolve(workspaceRoot, ".env");
  if (!fs.existsSync(envPath)) return undefined;

  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;

    const name = trimmed.slice(0, separatorIndex).trim();
    if (name !== key) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return undefined;
}

function getApiBaseUrl(): string {
  const fromProcess = process.env.VITE_API_BASE_URL?.trim();
  if (fromProcess) return fromProcess.replace(/\/$/, "");

  const fromEnvFile = readEnvFromFile("VITE_API_BASE_URL")?.trim();
  if (fromEnvFile) return fromEnvFile.replace(/\/$/, "");

  throw new Error(
    "VITE_API_BASE_URL is required for proxy mode. Set it in .env or shell env.",
  );
}

if (!fs.existsSync(indexFile)) {
  console.error("Missing build output at dist/public. Run `npm run build` first.");
  process.exit(1);
}

const apiBaseUrl = getApiBaseUrl();

app.use("/api-proxy", express.raw({ type: "*/*", limit: "10mb" }));

app.use("/api-proxy", async (req, res) => {
  try {
    const suffix = req.originalUrl.replace(/^\/api-proxy/, "").replace(/^\/+/, "");
    const normalizedBase = `${apiBaseUrl.replace(/\/$/, "")}/`;
    const targetUrl = new URL(suffix, normalizedBase);

    const upstreamHeaders = new Headers();
    for (const [key, rawValue] of Object.entries(req.headers)) {
      if (!rawValue) continue;
      const lowerKey = key.toLowerCase();
      if (lowerKey === "host" || HOP_BY_HOP_HEADERS.has(lowerKey)) continue;
      const value = Array.isArray(rawValue) ? rawValue.join(", ") : rawValue;
      upstreamHeaders.set(key, value);
    }

    const method = req.method.toUpperCase();
    const hasBody = method !== "GET" && method !== "HEAD";
    const rawBody = req.body as Buffer | undefined;

    const upstreamRes = await fetch(targetUrl, {
      method,
      headers: upstreamHeaders,
      body: hasBody && rawBody && rawBody.length > 0 ? rawBody : undefined,
    });

    res.status(upstreamRes.status);
    upstreamRes.headers.forEach((value, key) => {
      if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    const data = Buffer.from(await upstreamRes.arrayBuffer());
    res.send(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    res.status(502).json({ error: message });
  }
});

app.use(express.static(distDir));
app.get("/{*path}", (_req, res) => {
  res.sendFile(indexFile);
});

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`[start] static+proxy server listening on port ${port}`);
  console.log(`[start] proxy target: ${apiBaseUrl}`);
});
