import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Persistent file-backed cache path on server
const CACHE_FILE = path.join(process.cwd(), ".next", "sofea_cloud_store.json");

// In-memory cache for fast warm-lambda reads
let memoryStore: Record<string, any> = {};
let currentVersion = Date.now();
let isLoaded = false;

function loadStore() {
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

function saveStore() {
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

export async function GET(req: Request) {
  loadStore();
  const url = new URL(req.url);
  const since = parseInt(url.searchParams.get("since") || "0", 10);

  if (since >= currentVersion) {
    return NextResponse.json({ version: currentVersion, updated: false });
  }

  return NextResponse.json({
    version: currentVersion,
    updated: true,
    data: memoryStore,
  });
}

export async function POST(req: Request) {
  try {
    loadStore();
    const body = await req.json();
    const { key, data, updates } = body;

    if (updates && typeof updates === "object") {
      Object.assign(memoryStore, updates);
    } else if (key && data !== undefined) {
      memoryStore[key] = data;
    }

    currentVersion = Date.now();
    isLoaded = true;
    saveStore();

    return NextResponse.json({ success: true, version: currentVersion });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
