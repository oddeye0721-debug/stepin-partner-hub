// 공통: 세션 쿠키 서명·검증, 파트너 목록 조회
// 필요한 환경변수 (Cloudflare 대시보드 > 설정 > 변수 및 비밀):
//   SESSION_SECRET  임의의 긴 문자열 (세션 서명용)
//   ADMIN_PASSWORD  관리자 로그인 비밀번호
//   GITHUB_TOKEN    관리자 저장용 GitHub 토큰 (이 저장소 Contents 읽기/쓰기)
//   GITHUB_REPO     예: oddeye0721-debug/stepin-partner-hub
//   GITHUB_BRANCH   예: main

export const COOKIE = "sph_session";
export const SALT = "stepin-partner:";
const enc = new TextEncoder();

function b64url(bytes) {
  let s = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(str) {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function sha256hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signSession(env, payload) {
  if (!env.SESSION_SECRET) throw new Error("SESSION_SECRET not set");
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env.SESSION_SECRET), enc.encode(body));
  return body + "." + b64url(sig);
}

export async function readSession(request, env) {
  if (!env.SESSION_SECRET) return null;
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]+)"));
  if (!m) return null;
  const [body, sig] = m[1].split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(env.SESSION_SECRET), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function sessionCookie(token, maxAgeSec) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}
export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function loadPartners(request, env) {
  try {
    const res = await env.ASSETS.fetch(new Request(new URL("/data/partners.json", request.url).toString()));
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d.items) ? d.items : [];
  } catch (e) {
    return [];
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

export function safeEqual(a, b) {
  a = String(a || "");
  b = String(b || "");
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
