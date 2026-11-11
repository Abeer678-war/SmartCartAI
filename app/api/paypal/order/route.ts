import { auth } from "@clerk/nextjs/server";
import { DAYS, PRICE, paypalReady, pp } from "@/lib/paypal";
import { db } from "@/lib/supabase";

// Step 1: the server creates the order, so the price can't be changed in the browser.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!paypalReady()) return Response.json({ error: "PayPal isn't set up yet." }, { status: 503 });

  try {
    const r = await pp("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": crypto.randomUUID() },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          custom_id: userId,
          description: `My Smart Cart Super (${DAYS} days)`,
          amount: { currency_code: "USD", value: PRICE },
        }],
      }),
    });
    if (!r.ok || !r.data.id) {
      console.error("PayPal create order failed:", r.status, JSON.stringify(r.data));
      return Response.json({ error: "Could not start PayPal checkout." }, { status: 502 });
    }
    // Remember who started this order
    const { error } = await db.from("paypal_orders").insert({ order_id: r.data.id, user_id: userId });
    if (error) throw new Error(error.message);
    return Response.json({ id: r.data.id });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not start PayPal checkout." }, { status: 502 });
  }
}
