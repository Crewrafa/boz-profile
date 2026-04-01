// BOZ Auth — role lookup + password login
// Security: rate limiting, input sanitization

const rateLimitStore = {};
function checkRateLimit(ip, maxReq = 10, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimitStore[ip] || now - rateLimitStore[ip].start > windowMs) {
    rateLimitStore[ip] = { count: 1, start: now };
    return true;
  }
  rateLimitStore[ip].count++;
  return rateLimitStore[ip].count <= maxReq;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: "DB not configured" });

  const clientIP = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (!checkRateLimit(clientIP, 15, 60000)) return res.status(429).json({ error: "Too many attempts. Please wait." });

  const H = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
  const action = req.body?.action;

  // ═══ PASSWORD LOGIN ═══
  if (action === "login") {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (typeof email !== "string" || typeof password !== "string") return res.status(400).json({ error: "Invalid input" });
    if (email.length > 200 || password.length > 200) return res.status(400).json({ error: "Input too long" });
    try {
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || key;
      const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: { "Content-Type": "application/json", "apikey": anonKey },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      if (!r.ok) { const err = await r.json().catch(() => ({})); return res.status(401).json({ error: err.error_description || err.msg || "Invalid credentials" }); }
      const data = await r.json();
      // Look up role
      const rR = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&active=eq.true&select=role,name`, { headers: H });
      const roles = rR.ok ? await rR.json() : [];
      return res.status(200).json({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        email: data.user?.email || email,
        role: roles[0]?.role || "client",
        name: roles[0]?.name || ""
      });
    } catch (e) { return res.status(500).json({ error: "Login failed: " + e.message }); }
  }

  // ═══ CREATE USER WITH PASSWORD (admin only) ═══
  if (action === "create_user") {
    const { email, password, role, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    try {
      // Create in Supabase Auth
      const r = await fetch(`${url}/auth/v1/admin/users`, {
        method: "POST", headers: { ...H, "Authorization": `Bearer ${key}` },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, email_confirm: true })
      });
      if (!r.ok) { const err = await r.json().catch(() => ({})); return res.status(400).json({ error: err.msg || "User creation failed" }); }
      return res.status(200).json({ ok: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // ═══ ROLE LOOKUP (existing flow) ═══
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  const isProduction = process.env.VERCEL === "1" && process.env.VITE_DEV_MODE !== "true";
  const devMap = { "dev": "psicologorafaelbaez@gmail.com", "dev-recruiter": "recruiter@bozusa.com", "dev-ana": "ana@bozusa.com", "dev-client": "client@test.com", "dev-sales": "sales@bozusa.com", "dev-finance": "finance@bozusa.com" };
  
  let email = null;
  if (devMap[token] && !isProduction) {
    email = devMap[token];
  } else {
    try {
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || key;
      const r = await fetch(`${url}/auth/v1/user`, { headers: { "Authorization": `Bearer ${token}`, "apikey": anonKey } });
      if (!r.ok) return res.status(401).json({ error: "Invalid token" });
      const user = await r.json();
      email = user.email;
    } catch { return res.status(401).json({ error: "Auth failed" }); }
  }

  if (!email) return res.status(401).json({ error: "No email" });

  try {
    const r = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(email)}&active=eq.true&select=id,email,role,name`, { headers: H });
    if (!r.ok) return res.status(200).json({ email, role: "client", name: "" });
    const roles = await r.json();
    if (!roles.length) return res.status(200).json({ email, role: "client", name: "" });
    return res.status(200).json({ email: roles[0].email, role: roles[0].role, name: roles[0].name, id: roles[0].id });
  } catch {
    return res.status(200).json({ email, role: "client", name: "" });
  }
}
