// 관리자 비밀번호 로그인 (ADMIN_PASSWORD 환경변수)
import { signSession, sessionCookie, json, safeEqual } from "../../../lib/auth.js";

const HOURS = 12;

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET || !env.ADMIN_PASSWORD) {
    return json({ error: "서버에 관리자 비밀번호(ADMIN_PASSWORD) 또는 SESSION_SECRET이 설정되지 않았습니다." }, 500);
  }
  let body = {};
  try { body = await request.json(); } catch (e) {}
  // 무차별 대입을 늦추기 위한 지연
  await new Promise((r) => setTimeout(r, 400));
  if (!safeEqual(body.password, env.ADMIN_PASSWORD)) return json({ error: "관리자 비밀번호가 맞지 않습니다." }, 401);

  const token = await signSession(env, { role: "admin", name: "관리자", exp: Date.now() + HOURS * 36e5 });
  return json({ ok: true, name: "관리자" }, 200, { "Set-Cookie": sessionCookie(token, HOURS * 3600) });
}
