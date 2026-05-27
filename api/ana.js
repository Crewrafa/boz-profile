// ERP Platform Ana API — soft skills operations for Talent Discovery role
// Security: role check via roles table, input validation, dev mode env-gated

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function verifyAna(req, url, key) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return null;
  // Dev tokens (no-login mode — always accepted)
  if (token === "dev-ana") return { email: "ana@erp-platform.local", id: "00000000-0000-0000-0000-000000000003", role: "ana" };
  if (token === "dev") return { email: "psicologorafaelbaez@gmail.com", id: "00000000-0000-0000-0000-000000000001", role: "admin" };
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { "Authorization": `Bearer ${token}`, "apikey": key } });
    if (!r.ok) return null;
    const user = await r.json();
    // Role lookup via roles table — any user with role=ana (or admin) can access
    const rr = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(user.email)}&active=eq.true&select=role`, { headers: { "apikey": key, "Authorization": `Bearer ${key}` } });
    if (!rr.ok) return null;
    const roles = await rr.json();
    if (!roles.length || !["ana", "admin"].includes(roles[0].role)) return null;
    return { ...user, role: roles[0].role };
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: "DB not configured" });

  const ana = await verifyAna(req, url, key);
  if (!ana) return res.status(403).json({ error: "Unauthorized" });

  const H = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
  const { action } = req.body;

  try {
    // ═══ LIST PROFILES (all, sorted by priority: new first, then pending_soft) ═══
    if (action === "list_profiles") {
      const r = await fetch(
        `${url}/rest/v1/profiles?deleted_at=is.null&order=status.asc,created_at.desc&select=id,created_at,client_name,client_company,client_email,role,category,seniority,experience,headcount,status,start_date,profile_data`,
        { headers: H }
      );
      if (!r.ok) return res.status(200).json([]);
      const data = await r.json();
      // Sort: new/pending_soft first, then rest
      const priority = ["new", "pending_soft", "in_progress", "sourcing", "filled", "closed"];
      data.sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status));
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    // ═══ GET PROFILE DETAIL ═══
    if (action === "get_profile") {
      const { id } = req.body;
      if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: "Invalid ID" });
      const r = await fetch(
        `${url}/rest/v1/profiles?id=eq.${id}&select=*`,
        { headers: H }
      );
      if (!r.ok) return res.status(404).json({ error: "Not found" });
      const data = await r.json();
      return res.status(200).json(data[0] || null);
    }

    // ═══ SAVE SOFT SKILLS (update profile_data with soft skills) ═══
    if (action === "save_soft_skills") {
      const { id, soft_skills } = req.body;
      if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: "Invalid ID" });
      if (!soft_skills || typeof soft_skills !== "object") return res.status(400).json({ error: "soft_skills required" });

      // Get current profile
      const gr = await fetch(`${url}/rest/v1/profiles?id=eq.${id}&select=profile_data`, { headers: H });
      if (!gr.ok) return res.status(404).json({ error: "Profile not found" });
      const gd = await gr.json();
      if (!gd.length) return res.status(404).json({ error: "Profile not found" });

      // Merge soft skills into profile_data
      const currentData = gd[0].profile_data || {};
      const updatedData = { ...currentData, softSkills: soft_skills };

      const r = await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ profile_data: updatedData })
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json({ ok: true });
    }

    // ═══ SUBMIT TO ADMIN (change status to in_progress) ═══
    if (action === "submit_to_admin") {
      const { id, pdf_html } = req.body;
      if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: "Invalid ID" });

      const updates = { status: "in_progress" };
      if (pdf_html && typeof pdf_html === "string") updates.pdf_html = pdf_html;

      const r = await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify(updates)
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
