/**
 * Readiness check API route for Kubernetes readiness probe
 */
import { NextRequest, NextResponse } from "next/server";
import { getReadinessStatus } from "../../../health/health-check";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const result = await getReadinessStatus();

    // Return appropriate HTTP status code
    const status = result.status === "unhealthy" ? 503 : 200;

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
