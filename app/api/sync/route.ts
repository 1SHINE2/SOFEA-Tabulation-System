import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Upstash Redis Environment Variables (optional, if configured on Vercel)
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// GitHub Gist Cloud Sync (optional, if configured)
const GITHUB_TOKEN = process.env.GITHUB_SYNC_TOKEN;
const GIST_ID = process.env.GIST_ID;

// Persistent file cache on serverless lambda
const CACHE_FILE = path.join(process.cwd(), ".next", "sofea_cloud_store.json");

let memoryStore: Record<string, any> = {};
let currentVersion = Date.now();
let isLoaded = false;

function loadLocalFileCache() {
  if (isLoaded && Object.keys(memoryStore).length > 0) return;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.data === "object") {
        memoryStore = parsed.data;
        currentVersion = parsed.version || Date.now();
        isLoaded = true;
      }
    }
  } catch (e) {}
}

function saveLocalFileCache() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ version: currentVersion, data: memoryStore }),
      "utf-8"
    );
  } catch (e) {}
}

async function readFromCloudStore() {
  loadLocalFileCache();

  // Option 1: Upstash Redis REST
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/sofea_global_sync`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          const parsed = JSON.parse(json.result);
          if (parsed && parsed.data) {
            memoryStore = parsed.data;
            currentVersion = parsed.version || Date.now();
            isLoaded = true;
            return;
          }
        }
      }
    } catch (e) {}
  }

  // Option 2: GitHub Gist REST
  if (GITHUB_TOKEN && GIST_ID) {
    try {
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "SOFEA-Tabulation-App",
        },
        cache: "no-store",
      });
      if (res.ok) {
        const gist = await res.json();
        const content = gist.files?.["sofea_sync.json"]?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed && parsed.data) {
            memoryStore = parsed.data;
            currentVersion = parsed.version || Date.now();
            isLoaded = true;
            return;
          }
        }
      }
    } catch (e) {}
  }
}

async function writeToCloudStore() {
  saveLocalFileCache();
  const payload = JSON.stringify({ version: currentVersion, data: memoryStore });

  // Option 1: Upstash Redis REST
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await fetch(`${UPSTASH_URL}/set/sofea_global_sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        body: payload,
      });
    } catch (e) {}
  }

  // Option 2: GitHub Gist REST
  if (GITHUB_TOKEN && GIST_ID) {
    try {
      await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "SOFEA-Tabulation-App",
        },
        body: JSON.stringify({
          files: {
            "sofea_sync.json": { content: payload },
          },
        }),
      });
    } catch (e) {}
  }
}

export async function GET(req: Request) {
  await readFromCloudStore();
  const url = new URL(req.url);
  const since = parseInt(url.searchParams.get("since") || "0", 10);

  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  };

  if (since >= currentVersion) {
    return NextResponse.json({ version: currentVersion, updated: false }, { headers });
  }

  return NextResponse.json(
    {
      version: currentVersion,
      updated: true,
      data: memoryStore,
    },
    { headers }
  );
}

export async function POST(req: Request) {
  try {
    await readFromCloudStore();
    const body = await req.json();
    const { key, data, updates } = body;

    if (updates && typeof updates === "object") {
      Object.assign(memoryStore, updates);
    } else if (key && data !== undefined) {
      memoryStore[key] = data;
    }

    currentVersion = Date.now();
    isLoaded = true;
    await writeToCloudStore();

    const headers = {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    };

    return NextResponse.json({ success: true, version: currentVersion }, { headers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
