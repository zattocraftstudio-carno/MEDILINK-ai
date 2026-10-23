import { NextResponse } from "next/server";
import { getKeyPoolStatus, getTotalQuotaRemaining } from "@/lib/api-key-pool";

export const runtime = "nodejs";

export async function GET() {
  try {
    const keys = await getKeyPoolStatus();
    const totalQuota = await getTotalQuotaRemaining();

    return NextResponse.json({
      keys,
      totalQuotaRemaining: totalQuota,
      healthyKeys: keys.filter((k) => k.isHealthy).length,
      totalKeys: keys.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[MediLink] Admin key-status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch key status" },
      { status: 500 }
    );
  }
}