// Serves stored PDF HTML for a profile by ID
// URL: /api/pdf/[id]  →  e.g. /api/pdf/a1b2c3d4-...
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  const { id } = req.query;
  if (!id || typeof id !== "string" || id.length < 10) {
    return res.status(400).send("Invalid ID");
  }

  // Only allow UUID format to prevent injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).send("Invalid ID format");
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).send("Database not configured");

  try {
    const response = await fetch(
      `${url}/rest/v1/profiles?id=eq.${id}&select=pdf_html,role,client_name`,
      { headers: { "apikey": key, "Authorization": `Bearer ${key}` } }
    );
    const data = await response.json();
    if (!data || !data.length || !data[0].pdf_html) {
      return res.status(404).send("Profile not found");
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(data[0].pdf_html);
  } catch (e) {
    res.status(500).send("Server error");
  }
}
