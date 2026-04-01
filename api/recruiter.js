// BOZ Recruiter API — profile review, accept/reject, questions for Ana
// Accessible by: admin + recruiter roles
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function verifyRecruiter(req, url, key) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return null;
  const isProduction = process.env.VERCEL === "1" && process.env.VITE_DEV_MODE !== "true";
  const devMap = { "dev": { email: "psicologorafaelbaez@gmail.com", role: "admin" }, "dev-recruiter": { email: "recruiter@bozusa.com", role: "recruiter" } };
  if (devMap[token] && !isProduction) return devMap[token];
  if (devMap[token]) return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { "Authorization": `Bearer ${token}`, "apikey": key } });
    if (!r.ok) return null;
    const user = await r.json();
    const rr = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(user.email)}&active=eq.true&select=role`, { headers: { "apikey": key, "Authorization": `Bearer ${key}` } });
    if (!rr.ok) return null;
    const roles = await rr.json();
    if (!roles.length || !["admin", "recruiter"].includes(roles[0].role)) return null;
    return { ...user, role: roles[0].role };
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: "DB not configured" });

  const recruiter = await verifyRecruiter(req, url, key);
  if (!recruiter) return res.status(403).json({ error: "Unauthorized" });

  const H = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
  const { action } = req.body;

  try {
    // List profiles for review (new + pending_review)
    if (action === "list_profiles") {
      const r = await fetch(
        `${url}/rest/v1/profiles?order=created_at.desc&select=id,created_at,client_name,client_company,client_email,role,category,seniority,experience,headcount,status,start_date,profile_data`,
        { headers: H }
      );
      if (!r.ok) return res.status(200).json([]);
      const data = await r.json();
      const priority = ["new", "pending_review", "pending_soft", "in_progress", "sourcing", "filled", "closed"];
      data.sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status));
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    // Accept profile — add notes + questions, change status to pending_soft
    if (action === "accept_profile") {
      const { id, notes, questions } = req.body;
      if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: "Invalid ID" });

      // Get current profile data
      const gr = await fetch(`${url}/rest/v1/profiles?id=eq.${id}&select=profile_data`, { headers: H });
      if (!gr.ok) return res.status(404).json({ error: "Not found" });
      const gd = await gr.json();
      if (!gd.length) return res.status(404).json({ error: "Not found" });

      const currentData = gd[0].profile_data || {};
      const updatedData = {
        ...currentData,
        recruiterReview: {
          status: "accepted",
          notes: notes || "",
          questionsForAna: questions || [],
          reviewedAt: new Date().toISOString(),
          reviewedBy: recruiter.email,
        }
      };

      const r = await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ profile_data: updatedData, status: "pending_soft" })
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json({ ok: true });
    }

    // Reject profile
    if (action === "reject_profile") {
      const { id, notes } = req.body;
      if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: "Invalid ID" });

      const gr = await fetch(`${url}/rest/v1/profiles?id=eq.${id}&select=profile_data`, { headers: H });
      if (!gr.ok) return res.status(404).json({ error: "Not found" });
      const gd = await gr.json();
      if (!gd.length) return res.status(404).json({ error: "Not found" });

      const currentData = gd[0].profile_data || {};
      const updatedData = {
        ...currentData,
        recruiterReview: {
          status: "rejected",
          notes: notes || "",
          reviewedAt: new Date().toISOString(),
          reviewedBy: recruiter.email,
        }
      };

      const r = await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ profile_data: updatedData, status: "closed" })
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
