/**
 * Liveness probe endpoint for Next.js frontend
 */
import { NextResponse } from "next/server";
import { getLivenessStatus } from "../../../../health/health-check";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getLivenessStatus();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
