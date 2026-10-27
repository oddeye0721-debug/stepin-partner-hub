// 관리자 저장: public/data/<key>.json 을 GitHub에 커밋 → Cloudflare가 자동 재배포 (1~2분)
import { json } from "../../../lib/auth.js";

const KEYS = ["partners", "notices", "dealers", "videos", "faq", "contacts"];

function toB64(str) {
  const bytes = new TextEncoder().encode(str);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64) {
  const s = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function gh(env, method, path, body) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "stepin-partner-hub",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function getFile(env, path) {
  const branch = env.GITHUB_BRANCH || "main";
  const res = await gh(env, "GET", `${path}?ref=${encodeURIComponent(branch)}`);
  if (res.status === 404) return { sha: null, data: null };
  if (!res.ok) throw new Error(`GitHub 읽기 실패 (${res.status})`);
  const d = await res.json();
  return { sha: d.sha, data: JSON.parse(fromB64(d.content)) };
}

async function putFile(env, path, obj, sha, message) {
  const branch = env.GITHUB_BRANCH || "main";
  const res = await gh(env, "PUT", path, {
    message,
    content: toB64(JSON.stringify(obj, null, 1) + "\n"),
    branch,
    ...(sha ? { sha } : {}),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub 저장 실패 (${res.status}) ${t.slice(0, 200)}`);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return json({ error: "서버에 GITHUB_TOKEN / GITHUB_REPO가 설정되지 않아 저장할 수 없습니다." }, 500);
  }
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const { key, items, what } = body;
  if (!KEYS.includes(key) || !Array.isArray(items)) return json({ error: "잘못된 요청입니다." }, 400);
  if (JSON.stringify(items).length > 400000) return json({ error: "데이터가 너무 큽니다." }, 400);

  const now = new Date().toISOString();
  const label = String(what || `${key} 수정`).slice(0, 120);
  try {
    const cur = await getFile(env, `public/data/${key}.json`);
    await putFile(env, `public/data/${key}.json`, { items, updatedAt: now }, cur.sha, `[관리자] ${label}`);
    // 변경 이력 (최근 100건)
    try {
      const log = await getFile(env, "public/data/log.json");
      const list = [{ at: now, what: label, by: "admin" }, ...((log.data && log.data.items) || [])].slice(0, 100);
      await putFile(env, "public/data/log.json", { items: list, updatedAt: now }, log.sha, `[관리자] 변경 이력: ${label}`);
    } catch (e) {}
    return json({ ok: true, at: now });
  } catch (e) {
    return json({ error: e.message || "저장하지 못했습니다." }, 502);
  }
}
