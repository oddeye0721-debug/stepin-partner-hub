import { readSession, json } from "../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const s = await readSession(request, env);
  if (!s) return json({ error: "unauthorized" }, 401);
  return json({ name: s.name, role: s.role, adminReady: !!(env.GITHUB_TOKEN && env.GITHUB_REPO) });
}
