// BOZ Client API — profile operations for authenticated users
// Security: input validation, body size limit, auth verification, dev mode env-gated

const MAX_BODY_SIZE = 500000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitize(str, maxLen = 500) {
  if (typeof str !== "string") return "";
  return str.substring(0, maxLen).trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: "DB not configured" });

  // Body size check (larger limit for JD upload)
  const maxSize = req.body?.action === "upload_jd" ? 8000000 : MAX_BODY_SIZE;
  const bodyStr = JSON.stringify(req.body || {});
  if (bodyStr.length > maxSize) return res.status(413).json({ error: "Request too large" });

  // Auth
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  let userId = null;
  const isProduction = process.env.VERCEL === "1" && process.env.VITE_DEV_MODE !== "true";

  if (!isProduction && (token === "dev" || token === "dev-client")) {
    userId = token === "dev" ? "00000000-0000-0000-0000-000000000001" : "00000000-0000-0000-0000-000000000002";
  } else if (token === "dev" || token === "dev-client") {
    return res.status(401).json({ error: "Dev mode disabled" });
  } else {
    try {
      const r = await fetch(`${url}/auth/v1/user`, {
        headers: { "Authorization": `Bearer ${token}`, "apikey": key }
      });
      if (!r.ok) return res.status(401).json({ error: "Invalid token" });
      const user = await r.json();
      if (!user.id || !UUID_RE.test(user.id)) return res.status(401).json({ error: "Invalid user" });
      userId = user.id;
    } catch {
      return res.status(401).json({ error: "Auth failed" });
    }
  }

  const H = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
  const { action } = req.body;

  try {
    if (action === "save_profile") {
      const { profile_data } = req.body;
      if (!profile_data) return res.status(400).json({ error: "profile_data required" });

      const role = sanitize(profile_data.role, 200);
      const category = sanitize(profile_data.category, 100);
      if (!role || !category) return res.status(400).json({ error: "role and category required" });

      const row = {
        client_name: sanitize(profile_data.client_name, 200),
        client_company: sanitize(profile_data.client_company, 200),
        client_email: sanitize(profile_data.client_email, 200),
        start_date: profile_data.start_date || null,
        role, category,
        seniority: sanitize(profile_data.seniority, 50),
        experience: sanitize(profile_data.experience, 50),
        headcount: Math.min(Math.max(parseInt(profile_data.headcount) || 1, 1), 100),
        profile_data: profile_data.profile_data || {},
        pdf_html: profile_data.pdf_html || "",
        user_id: userId,
        status: "new",
      };

      const r = await fetch(`${url}/rest/v1/profiles`, {
        method: "POST",
        headers: { ...H, "Prefer": "return=representation" },
        body: JSON.stringify(row),
      });
      if (!r.ok) { const err = await r.text(); return res.status(r.status).json({ error: err }); }
      const d = await r.json();
      return res.status(200).json(d[0] || d);
    }

    if (action === "list_profiles") {
      const r = await fetch(
        `${url}/rest/v1/profiles?user_id=eq.${userId}&order=created_at.desc&select=id,created_at,client_name,client_company,role,category,seniority,status`,
        { headers: H }
      );
      if (!r.ok) return res.status(200).json([]);
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    if (action === "upload_jd") {
      const { profile_id, file_base64, file_name, mime_type } = req.body;
      if (!profile_id || !file_base64 || !file_name) return res.status(400).json({ error: "profile_id, file_base64, file_name required" });
      const buffer = Buffer.from(file_base64, "base64");
      if (buffer.length > 5 * 1024 * 1024) return res.status(413).json({ error: "JD file too large (max 5MB)" });
      const safeName = file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `jd/${profile_id}/${Date.now()}_${safeName}`;
      const upRes = await fetch(`${url}/storage/v1/object/documents/${path}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "apikey": key, "Content-Type": mime_type || "application/octet-stream", "x-upsert": "true" },
        body: buffer,
      });
      if (!upRes.ok) return res.status(500).json({ error: "JD upload failed" });
      // Update profile_data with jd path
      const pR = await fetch(`${url}/rest/v1/profiles?id=eq.${profile_id}&select=profile_data`, { headers: H });
      const existing = (await pR.json())[0];
      const pd = existing?.profile_data || {};
      pd.jdFilePath = path;
      pd.jdFileName = safeName;
      await fetch(`${url}/rest/v1/profiles?id=eq.${profile_id}`, {
        method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ profile_data: pd })
      });
      return res.status(200).json({ ok: true, path });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
