import { auth } from "@clerk/nextjs/server";
import { LIMITS, getProfile, setPlan, usage } from "@/lib/plans";
import { DAYS, PRICE, paypalReady } from "@/lib/paypal";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const [profile, used] = await Promise.all([getProfile(userId), usage(userId)]);
  const pay = paypalReady();
  return Response.json({
    plan: profile.plan, until: profile.until, days: DAYS, limits: LIMITS, used,
    price: pay ? `$${PRICE}` : `₹${process.env.SUPER_PRICE || "149"}`,
    paypalClientId: pay ? process.env.PAYPAL_CLIENT_ID : null, // public id, safe for the browser
    demo: process.env.DEMO_PLANS === "true",
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { plan } = await req.json().catch(() => ({}));
  if (plan !== "basic" && plan !== "super") return Response.json({ error: "Unknown plan." }, { status: 400 });

  // Super is only granted by a verified PayPal payment. DEMO_PLANS is for testing and is ignored once PayPal is set up.
  if (plan === "super" && (paypalReady() || process.env.DEMO_PLANS !== "true"))
    return Response.json({ error: "Super needs a payment first." }, { status: 402 });

  try {
    await setPlan(userId, plan);
    return Response.json({ plan });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not save your plan." }, { status: 500 });
  }
}
