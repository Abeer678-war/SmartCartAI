import { auth } from "@clerk/nextjs/server";
import { DAYS, PRICE, paypalReady, pp } from "@/lib/paypal";
import { getProfile, setPlan } from "@/lib/plans";
import { db } from "@/lib/supabase";

// Step 2: take the money, check it with PayPal, then turn Super on. Never trust the browser.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!paypalReady()) return Response.json({ error: "PayPal isn't set up yet." }, { status: 503 });

  const { orderId } = await req.json().catch(() => ({}));
  if (typeof orderId !== "string" || !/^[A-Za-z0-9-]{5,64}$/.test(orderId))
    return Response.json({ error: "Invalid order." }, { status: 400 });

  try {
    // The order must have been started by THIS user
    const { data: own } = await db.from("paypal_orders").select("order_id").eq("order_id", orderId).eq("user_id", userId).maybeSingle();
    if (!own) return Response.json({ error: "This payment doesn't match your account." }, { status: 403 });

    const r = await pp(`/v2/checkout/orders/${orderId}/capture`, {
      method: "POST", headers: { "PayPal-Request-Id": `capture-${orderId}` }, body: "{}",
    });
    if (!r.ok) {
      console.error("PayPal capture failed:", r.status, JSON.stringify(r.data));
      return Response.json({ error: "PayPal could not complete the payment." }, { status: 502 });
    }
    const cap = r.data.purchase_units?.[0]?.payments?.captures?.[0];
    if (!cap || cap.amount?.currency_code !== "USD" || cap.amount?.value !== PRICE)
      return Response.json({ error: "The payment amount didn't match." }, { status: 403 });
    if (r.data.status !== "COMPLETED" || cap.status !== "COMPLETED")
      return Response.json({ pending: true, message: "Your payment is still pending with PayPal. Please contact support if Super doesn't turn on." }, { status: 202 });

    // Each paid order can switch Super on only once (atomic claim)
    const { data: claimed } = await db.from("paypal_orders")
      .update({ granted_at: new Date().toISOString() })
      .eq("order_id", orderId).eq("user_id", userId).is("granted_at", null).select("order_id");
    if (!claimed?.length) return Response.json({ plan: "super", already: true });

    // Add the days on top of any Super time they still have
    const prof = await getProfile(userId);
    let until: string | null = null;
    if (!(prof.plan === "super" && !prof.until)) {
      const base = prof.until ? new Date(prof.until).getTime() : Date.now();
      until = new Date(base + DAYS * 86400_000).toISOString();
    }
    try {
      await setPlan(userId, "super", until);
    } catch (e) {
      await db.from("paypal_orders").update({ granted_at: null }).eq("order_id", orderId); // let them retry
      throw e;
    }
    return Response.json({ plan: "super", until });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not turn on Super. Please contact support." }, { status: 500 });
  }
}
