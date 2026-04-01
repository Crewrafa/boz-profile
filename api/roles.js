// BOZ Roles API — user management for admin
const ADMIN_EMAILS = ["psicologorafaelbaez@gmail.com"];

async function verifyAdmin(req, url, key) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return null;
  const isProduction = process.env.VERCEL === "1" && process.env.VITE_DEV_MODE !== "true";
  if (token === "dev" && !isProduction) return { email: ADMIN_EMAILS[0], role: "admin" };
  if (token === "dev") return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { "Authorization": `Bearer ${token}`, "apikey": key } });
    if (!r.ok) return null;
    const user = await r.json();
    // Check roles table
    const rr = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(user.email)}&active=eq.true&select=role`, { headers: { "apikey": key, "Authorization": `Bearer ${key}` } });
    if (!rr.ok) return null;
    const roles = await rr.json();
    if (!roles.length || roles[0].role !== "admin") return null;
    return { ...user, role: "admin" };
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: "DB not configured" });

  const admin = await verifyAdmin(req, url, key);
  if (!admin) return res.status(403).json({ error: "Unauthorized — admin only" });

  const H = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
  const { action } = req.body;

  try {
    // List all roles
    if (action === "list") {
      const r = await fetch(`${url}/rest/v1/roles?order=created_at.asc&select=*`, { headers: H });
      return res.status(200).json(await r.json());
    }

    // Get role by email (used for auth)
    if (action === "get_role") {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });
      const r = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(email)}&active=eq.true&select=*`, { headers: H });
      const d = await r.json();
      return res.status(200).json(d[0] || null);
    }

    // Add user
    if (action === "add") {
      const { email, role, name } = req.body;
      if (!email || !role) return res.status(400).json({ error: "Email and role required" });
      const valid = ["admin", "sales", "recruiter", "ana", "finance"];
      if (!valid.includes(role)) return res.status(400).json({ error: "Invalid role" });
      const r = await fetch(`${url}/rest/v1/roles`, { method: "POST", headers: { ...H, "Prefer": "return=representation" }, body: JSON.stringify({ email: email.toLowerCase().trim(), role, name: name || "" }) });
      if (!r.ok) { const t = await r.text(); return res.status(400).json({ error: t.includes("duplicate") ? "Email already exists" : t }); }
      const d = await r.json();
      return res.status(200).json(d[0] || d);
    }

    // Update user role or status
    if (action === "update") {
      const { id, role, name, active } = req.body;
      if (!id) return res.status(400).json({ error: "ID required" });
      const updates = {};
      if (role) updates.role = role;
      if (name !== undefined) updates.name = name;
      if (active !== undefined) updates.active = active;
      await fetch(`${url}/rest/v1/roles?id=eq.${id}`, { method: "PATCH", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify(updates) });
      return res.status(200).json({ ok: true });
    }

    // Delete user
    if (action === "delete") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID required" });
      await fetch(`${url}/rest/v1/roles?id=eq.${id}`, { method: "DELETE", headers: H });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
