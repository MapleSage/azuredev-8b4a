/**
 * Readiness probe endpoint for Next.js frontend
 */
import { NextResponse } from "next/server";
import { getReadinessStatus } from "../../../../health/health-check";

export async function GET() {
  try {
    const result = await getReadinessStatus();

    const status = result.status === "healthy" ? 200 : 503;

    return NextResponse.json(result, { status });
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
