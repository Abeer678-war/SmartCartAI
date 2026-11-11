// Server-only PayPal helpers (needs only PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET).
const BASE = process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export const PRICE = Number(process.env.SUPER_PRICE_USD || 2).toFixed(2); // USD, PayPal can't charge INR
export const DAYS = Number(process.env.SUPER_DAYS || 30);
export const paypalReady = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

async function token(): Promise<string> {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!r.ok) throw new Error("PayPal auth failed: " + r.status);
  return (await r.json()).access_token;
}

export async function pp(path: string, init: RequestInit = {}) {
  const t = await token();
  const r = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const data: any = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}
