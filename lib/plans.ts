import { db } from "./supabase";

export type PlanId = "basic" | "super";

const n = (v: string | undefined, d: number) => Number(v || d);

// Basic = the limits the app already had. Super = higher limits.
export const LIMITS: Record<PlanId, { hour: number; day: number; history: number }> = {
  basic: { hour: n(process.env.SEARCHES_PER_HOUR, 10), day: n(process.env.SEARCHES_PER_DAY, 40), history: 20 },
  super: { hour: n(process.env.SUPER_SEARCHES_PER_HOUR, 60), day: n(process.env.SUPER_SEARCHES_PER_DAY, 300), history: 100 },
};

// No row (or no profiles table yet) = Basic. An ended Super counts as Basic automatically.
export async function getProfile(userId: string): Promise<{ plan: PlanId; until: string | null }> {
  const { data, error } = await db.from("profiles").select("plan,plan_until").eq("user_id", userId).maybeSingle();
  if (error) console.error("profiles read failed (did you run supabase.sql?):", error.message);
  const live = data?.plan === "super" && (!data.plan_until || new Date(data.plan_until).getTime() > Date.now());
  return { plan: live ? "super" : "basic", until: live ? data!.plan_until : null };
}

export const getPlan = async (userId: string) => (await getProfile(userId)).plan;

export async function setPlan(userId: string, plan: PlanId, until: string | null = null) {
  const { error } = await db.from("profiles").upsert({
    user_id: userId, plan, plan_until: until, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function usage(userId: string) {
  const count = async (ms: number) =>
    (await db.from("searches").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", new Date(Date.now() - ms).toISOString())).count ?? 0;
  const [hour, day] = await Promise.all([count(3600_000), count(86400_000)]);
  return { hour, day };
}
