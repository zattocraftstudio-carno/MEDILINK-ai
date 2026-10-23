/**
 * MediLink AI — Redis client for persistent quota tracking.
 * Optional dependency: falls back to in-memory if Redis not configured.
 */

let redis: any = null;
let redisTested = false;

export async function getRedisClient(): Promise<any> {
  if (redis) return redis;
  if (redisTested) return null;

  try {
    // @ts-ignore - optional dependency
    const { Redis } = await import("@upstash/redis");
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      redis = new Redis({ url, token });
      redisTested = true;
      console.log("[MediLink] Upstash Redis connected for quota persistence");
      return redis;
    }
  } catch {
    // @upstash/redis not installed or config missing
  }

  redisTested = true;
  return null;
}

export async function getQuotaFromRedis(keyLabel: string): Promise<number | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const today = new Date().toISOString().split("T")[0];
    const count = await client.get(`quota:${keyLabel}:${today}`);
    return count ? parseInt(count, 10) : 0;
  } catch {
    return null;
  }
}

export async function incrementQuotaInRedis(keyLabel: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const today = new Date().toISOString().split("T")[0];
    const key = `quota:${keyLabel}:${today}`;
    await client.incr(key);
    // Expire at end of day (86400 seconds) + 1 hour buffer
    await client.expire(key, 90000);
  } catch {
    // Silent fail - in-memory tracking still works
  }
}

export async function resetQuotaInRedis(keyLabel: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const today = new Date().toISOString().split("T")[0];
    await client.del(`quota:${keyLabel}:${today}`);
  } catch {
    // Silent fail
  }
}