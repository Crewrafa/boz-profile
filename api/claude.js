// ═══════════════════════════════════════════════════════════
// BOZ IT Staffing — Secure Claude API Proxy
// Security: origin check, body validation, model lock, token cap
// ═══════════════════════════════════════════════════════════

const ALLOWED_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS_CAP = 2000;
const MAX_BODY_SIZE = 50000; // ~50KB max request body

export default async function handler(req, res) {
  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured. Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables." });
  }

  // Origin / Referer check — block requests from unknown origins
  const origin = req.headers.origin || req.headers.referer || "";
  const allowedHost = process.env.VERCEL_URL || "";
  const customDomain = process.env.ALLOWED_ORIGIN || "";

  // In production, verify the origin matches our domain
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
    const isVercel = allowedHost && origin.includes(allowedHost);
    const isCustom = customDomain && origin.includes(customDomain);
    const isVercelPreview = origin.includes(".vercel.app");

    if (!isLocal && !isVercel && !isCustom && !isVercelPreview && origin) {
      return res.status(403).json({ error: "Forbidden: unauthorized origin" });
    }
  }

  // Validate body exists and is reasonable size
  const bodyStr = JSON.stringify(req.body || {});
  if (bodyStr.length > MAX_BODY_SIZE) {
    return res.status(413).json({ error: "Request too large" });
  }

  // Validate required structure
  const { messages, system, max_tokens } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid request: messages array required" });
  }

  // Validate messages structure
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: "Invalid message format" });
    }
    if (!["user", "assistant"].includes(msg.role)) {
      return res.status(400).json({ error: "Invalid message role" });
    }
  }

  // Build sanitized request — lock model, cap tokens
  const safeBody = {
    model: ALLOWED_MODEL,
    max_tokens: Math.min(max_tokens || MAX_TOKENS_CAP, MAX_TOKENS_CAP),
    messages: messages,
  };
  if (system && typeof system === "string" && system.length < 5000) {
    safeBody.system = system;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(safeBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `Anthropic API error: ${response.status}`;
      return res.status(response.status).json({ error: errMsg });
    }

    // Only return content, strip metadata
    return res.status(200).json({
      content: data.content,
      usage: data.usage,
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error: " + (error.message || "Unknown") });
  }
}
