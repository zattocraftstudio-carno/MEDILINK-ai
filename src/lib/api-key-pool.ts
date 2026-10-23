/**
 * MediLink AI — OpenRouter API Key Pool with rotation, health tracking, and quota management.
 *
 * Manages multiple API keys to avoid quota exhaustion. Automatically detects rate limits
 * (429) and quota errors (402), cools down affected keys, and routes requests to healthy keys.
 * Uses Redis (Upstash) for persistent quota tracking across instances when available.
 */

import {
  getQuotaFromRedis,
  incrementQuotaInRedis,
  resetQuotaInRedis,
} from "./redis";

export interface ApiKeyConfig {
  key: string;
  label: string;
  dailyLimit: number;
  requestsToday: number;
  inFlight: number;
  lastReset: string;
  isHealthy: boolean;
  cooldownUntil: number;
  consecutiveFailures: number;
}

const DAILY_QUOTA_PER_KEY = 1000;
const COOLDOWN_MS = 60_000;
const MAX_CONSECUTIVE_FAILURES = 3;
const HEALTH_CHECK_INTERVAL_MS = 5 * 60_000;

let keyPool: ApiKeyConfig[] = [];
let initialized = false;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function createKeyConfig(key: string, label: string): ApiKeyConfig {
  return {
    key,
    label,
    dailyLimit: DAILY_QUOTA_PER_KEY,
    requestsToday: 0,
    inFlight: 0,
    lastReset: getTodayString(),
    isHealthy: true,
    cooldownUntil: 0,
    consecutiveFailures: 0,
  };
}

async function loadQuotasFromRedis(): Promise<void> {
  for (const k of keyPool) {
    const redisCount = await getQuotaFromRedis(k.label);
    if (redisCount !== null) {
      k.requestsToday = redisCount;
    }
  }
}

export async function initializeKeyPool(keys: string[]): Promise<void> {
  if (initialized) return;

  keyPool = keys
    .filter((k): k is string => !!k && k.trim().length > 0)
    .map((key, index) => createKeyConfig(key.trim(), `key-${index + 1}`));

  // Fallback: when no numbered keys exist, use the legacy OPENROUTER_API_KEY.
  if (keyPool.length === 0) {
    const legacy = process.env.OPENROUTER_API_KEY;
    if (legacy && legacy.trim()) {
      keyPool = [createKeyConfig(legacy.trim(), "key-legacy")];
      console.log("[MediLink] Using legacy OPENROUTER_API_KEY as sole pool member");
    } else {
      console.warn("[MediLink] No OpenRouter API keys configured. Add OPENROUTER_API_KEY_1..5 to environment.");
    }
  } else {
    console.log(`[MediLink] Initialized API key pool with ${keyPool.length} key(s)`);
  }

  await loadQuotasFromRedis();
  initialized = true;
  startHealthCheckTimer();
}

function startHealthCheckTimer(): void {
  if (healthCheckTimer) return;
  healthCheckTimer = setInterval(() => {
    const now = Date.now();
    for (const k of keyPool) {
      if (!k.isHealthy && k.cooldownUntil <= now) {
        k.isHealthy = true;
        k.consecutiveFailures = 0;
        console.log(`[MediLink] Key ${k.label} recovered from cooldown`);
      }
    }
    void resetDailyCountersIfNeeded().catch((err) =>
      console.warn("[MediLink] daily reset error:", err)
    );
  }, HEALTH_CHECK_INTERVAL_MS);
}

async function resetDailyCountersIfNeeded(): Promise<void> {
  const today = getTodayString();
  for (const k of keyPool) {
    if (k.lastReset !== today) {
      k.requestsToday = 0;
      k.lastReset = today;
      await resetQuotaInRedis(k.label);
    }
  }
}

export async function selectHealthyKey(): Promise<ApiKeyConfig | null> {
  if (!initialized) {
    const envKeys = [
      process.env.OPENROUTER_API_KEY_1,
      process.env.OPENROUTER_API_KEY_2,
      process.env.OPENROUTER_API_KEY_3,
      process.env.OPENROUTER_API_KEY_4,
      process.env.OPENROUTER_API_KEY_5,
    ].filter(Boolean) as string[];
    await initializeKeyPool(envKeys);
  }

  await resetDailyCountersIfNeeded();
  const now = Date.now();

  const available = keyPool
    .filter((k) => k.isHealthy && k.cooldownUntil <= now && k.requestsToday < k.dailyLimit)
    .sort((a, b) => {
      // Primary tie-breaker: least active in-flight requests (distributes concurrent bursts across all keys)
      if (a.inFlight !== b.inFlight) {
        return a.inFlight - b.inFlight;
      }
      // Secondary: least total requests today
      return a.requestsToday - b.requestsToday;
    });

  const selected = available[0] ?? null;
  if (selected) {
    selected.inFlight++;
  }
  return selected;
}

export function releaseKey(keyConfig: ApiKeyConfig | null): void {
  if (keyConfig) {
    keyConfig.inFlight = Math.max(0, keyConfig.inFlight - 1);
  }
}

export async function markKeySuccess(keyConfig: ApiKeyConfig): Promise<void> {
  keyConfig.inFlight = Math.max(0, keyConfig.inFlight - 1);
  keyConfig.requestsToday++;
  keyConfig.consecutiveFailures = 0;
  keyConfig.isHealthy = true;
  keyConfig.cooldownUntil = 0;
  await incrementQuotaInRedis(keyConfig.label);
}

export async function markKeyFailed(keyConfig: ApiKeyConfig, status: number): Promise<void> {
  keyConfig.inFlight = Math.max(0, keyConfig.inFlight - 1);
  keyConfig.requestsToday++;
  keyConfig.consecutiveFailures++;
  await incrementQuotaInRedis(keyConfig.label);

  if (status === 429 || status === 402) {
    keyConfig.cooldownUntil = Date.now() + COOLDOWN_MS;
    keyConfig.isHealthy = false;
    console.warn(`[MediLink] Key ${keyConfig.label} rate limited / quota exceeded. Cooling down for ${COOLDOWN_MS / 1000}s`);
  } else if (status >= 500) {
    keyConfig.cooldownUntil = Date.now() + 30_000;
    console.warn(`[MediLink] Key ${keyConfig.label} server error (${status}). Short cooldown.`);
  } else if (status >= 400) {
    keyConfig.cooldownUntil = Date.now() + 300_000;
    console.warn(`[MediLink] Key ${keyConfig.label} client error (${status}). Longer cooldown.`);
  }

  if (keyConfig.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    keyConfig.isHealthy = false;
    keyConfig.cooldownUntil = Date.now() + 300_000;
    console.error(`[MediLink] Key ${keyConfig.label} marked unhealthy after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
  }
}

export async function getKeyPoolStatus(): Promise<Array<{
  label: string;
  requestsToday: number;
  quotaRemaining: number;
  isHealthy: boolean;
  cooldownRemainingMs: number;
  consecutiveFailures: number;
}>> {
  if (!initialized) {
    const envKeys = [
      process.env.OPENROUTER_API_KEY_1,
      process.env.OPENROUTER_API_KEY_2,
      process.env.OPENROUTER_API_KEY_3,
      process.env.OPENROUTER_API_KEY_4,
      process.env.OPENROUTER_API_KEY_5,
    ].filter(Boolean) as string[];
    await initializeKeyPool(envKeys);
  }
  await resetDailyCountersIfNeeded();
  const now = Date.now();

  return keyPool.map((k) => ({
    label: k.label,
    requestsToday: k.requestsToday,
    quotaRemaining: Math.max(0, k.dailyLimit - k.requestsToday),
    isHealthy: k.isHealthy,
    cooldownRemainingMs: Math.max(0, k.cooldownUntil - now),
    consecutiveFailures: k.consecutiveFailures,
  }));
}

export async function getTotalQuotaRemaining(): Promise<number> {
  if (!initialized) return 0;
  await resetDailyCountersIfNeeded();
  return keyPool.reduce((sum, k) => sum + Math.max(0, k.dailyLimit - k.requestsToday), 0);
}

export function shutdownKeyPool(): void {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}