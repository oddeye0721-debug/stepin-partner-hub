// 모든 요청 앞단: 로그인하지 않은 방문자는 로그인 페이지로 보냅니다.
import { readSession, loadPartners } from "../lib/auth.js";

const PUBLIC_EXACT = new Set(["/login", "/login.html", "/favicon.ico", "/robots.txt", "/img/keyvisual_arcade_motion.jpg"]);
const PUBLIC_PREFIX = ["/api/login", "/api/admin/login", "/api/logout"];

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (PUBLIC_EXACT.has(path) || PUBLIC_PREFIX.some((p) => path.startsWith(p))) {
    return next();
  }

  const session = await readSession(request, env);
  const isHtml = path === "/" || path.endsWith(".html");

  if (!session) {
    if (isHtml) return Response.redirect(new URL("/login", url).toString(), 302);
    return new Response("로그인이 필요합니다.", { status: 401 });
  }

  // 파트너 코드 해시 목록과 관리자 API는 관리자만
  if ((path === "/data/partners.json" || path.startsWith("/api/admin/")) && session.role !== "admin") {
    return new Response("권한이 없습니다.", { status: 403 });
  }

  // 페이지를 열 때마다 코드가 여전히 유효한지 확인 (사용 중지된 코드 차단)
  if (isHtml && session.role === "partner") {
    const partners = await loadPartners(request, env);
    const p = partners.find((x) => x.hash === session.h && x.active !== false);
    if (!p) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?expired=1", "Set-Cookie": "sph_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" },
      });
    }
  }

  const res = await next();
  if (isHtml || path.startsWith("/data/")) {
    const r = new Response(res.body, res);
    r.headers.set("Cache-Control", "no-store");
    return r;
  }
  return res;
}
