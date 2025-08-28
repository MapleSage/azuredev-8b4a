/**
 * Health check API routes for Next.js frontend
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getHealthStatus,
  getLivenessStatus,
  getReadinessStatus,
} from "../../../health/health-check";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const details = searchParams.get("details") === "true";

    const result = await getHealthStatus(details);

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
