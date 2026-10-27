// Cloudflare Workers 진입점.
// Pages 방식(functions/ 폴더)과 같은 코드를 그대로 사용해, Workers로 배포해도 동일하게 동작합니다.
import { onRequest as middleware } from "../functions/_middleware.js";
import * as login from "../functions/api/login.js";
import * as logout from "../functions/api/logout.js";
import * as me from "../functions/api/me.js";
import * as adminLogin from "../functions/api/admin/login.js";
import * as adminSave from "../functions/api/admin/save.js";

const ROUTES = {
  "/api/login": login,
  "/api/logout": logout,
  "/api/me": me,
  "/api/admin/login": adminLogin,
  "/api/admin/save": adminSave,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const next = async () => {
      const mod = ROUTES[url.pathname];
      if (mod) {
        const m = request.method.toUpperCase();
        const fn = mod["onRequest" + m[0] + m.slice(1).toLowerCase()] || mod.onRequest;
        if (!fn) return new Response("Method Not Allowed", { status: 405 });
        return fn({ request, env, ctx });
      }
      if (url.pathname.startsWith("/api/")) return new Response("Not Found", { status: 404 });
      return env.ASSETS.fetch(request);
    };
    return middleware({ request, env, next });
  },
};
