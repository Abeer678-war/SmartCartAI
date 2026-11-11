import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase";
import { LIMITS, getPlan } from "@/lib/plans";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limit = LIMITS[await getPlan(userId)].history;
  const { data } = await db.from("searches").select("id,query,result,created_at")
    .eq("user_id", userId).not("result", "is", null)
    .order("created_at", { ascending: false }).limit(limit);
  return Response.json({ history: data ?? [] });
}
