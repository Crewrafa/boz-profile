// BOZ Auth — looks up user role from roles table
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: "DB not configured" });

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  const H = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };

  // Dev mode tokens
  const isProduction = process.env.VERCEL === "1" && process.env.VITE_DEV_MODE !== "true";
  const devMap = { "dev": "psicologorafaelbaez@gmail.com", "dev-recruiter": "recruiter@bozusa.com", "dev-ana": "ana@bozusa.com", "dev-client": "client@test.com", "dev-sales": "sales@bozusa.com", "dev-finance": "finance@bozusa.com" };
  
  let email = null;
  if (devMap[token] && !isProduction) {
    email = devMap[token];
  } else {
    // Real auth — get user from Supabase
    try {
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || key;
      const r = await fetch(`${url}/auth/v1/user`, { headers: { "Authorization": `Bearer ${token}`, "apikey": anonKey } });
      if (!r.ok) return res.status(401).json({ error: "Invalid token" });
      const user = await r.json();
      email = user.email;
    } catch { return res.status(401).json({ error: "Auth failed" }); }
  }

  if (!email) return res.status(401).json({ error: "No email" });

  // Look up role in DB
  try {
    const r = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(email)}&active=eq.true&select=id,email,role,name`, { headers: H });
    if (!r.ok) return res.status(200).json({ email, role: "client", name: "" }); // Default to client
    const roles = await r.json();
    if (!roles.length) return res.status(200).json({ email, role: "client", name: "" }); // Not in roles table = client
    return res.status(200).json({ email: roles[0].email, role: roles[0].role, name: roles[0].name, id: roles[0].id });
  } catch {
    return res.status(200).json({ email, role: "client", name: "" });
  }
}
