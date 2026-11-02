// 파트너 코드 로그인
import { SALT, sha256hex, loadPartners, signSession, sessionCookie, json } from "../../lib/auth.js";

const DAYS = 14;

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) return json({ error: "서버 설정(SESSION_SECRET)이 비어 있습니다. 관리자에게 문의해 주세요." }, 500);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const code = String(body.code || "").trim().normalize("NFC");
  if (!code) return json({ error: "파트너 코드를 입력해 주세요." }, 400);
  if (code.length > 64) return json({ error: "등록되지 않았거나 사용이 중지된 코드입니다." }, 401);

  const partners = await loadPartners(request, env);
  // 새 코드: 입력한 그대로(대소문자 구분). 이전 형식 코드: 대문자 · 공백 제거로도 확인
  const candidates = [code, code.toUpperCase().replace(/\s+/g, "")];
  let p = null, h = "";
  for (const c of candidates) {
    h = await sha256hex(SALT + c);
    p = partners.find((x) => x.hash === h && x.active !== false);
    if (p) break;
  }
  if (!p) return json({ error: "등록되지 않았거나 사용이 중지된 코드입니다. 대소문자를 확인하거나 본사에 문의해 주세요." }, 401);

  const token = await signSession(env, { role: "partner", h, name: p.name, exp: Date.now() + DAYS * 864e5 });
  return json({ ok: true, name: p.name }, 200, { "Set-Cookie": sessionCookie(token, DAYS * 86400) });
}
