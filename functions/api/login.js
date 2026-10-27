// 파트너 코드 로그인
import { SALT, sha256hex, loadPartners, signSession, sessionCookie, json } from "../../lib/auth.js";

const DAYS = 14;

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) return json({ error: "서버 설정(SESSION_SECRET)이 비어 있습니다. 관리자에게 문의해 주세요." }, 500);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const code = String(body.code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!code) return json({ error: "파트너 코드를 입력해 주세요." }, 400);

  const h = await sha256hex(SALT + code);
  const partners = await loadPartners(request, env);
  const p = partners.find((x) => x.hash === h && x.active !== false);
  if (!p) return json({ error: "등록되지 않았거나 사용이 중지된 코드입니다. 대소문자와 하이픈(-)을 확인하거나 본사에 문의해 주세요." }, 401);

  const token = await signSession(env, { role: "partner", h, name: p.name, exp: Date.now() + DAYS * 864e5 });
  return json({ ok: true, name: p.name }, 200, { "Set-Cookie": sessionCookie(token, DAYS * 86400) });
}
