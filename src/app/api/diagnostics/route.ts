import { NextResponse } from "next/server";
import { getCosmosConfig, getCosmosContainer } from "@/lib/azure/cosmos";

export const runtime = "nodejs";

export async function GET() {
  const config = getCosmosConfig();
  if (!config) {
    return NextResponse.json({
      cosmos: {
        configured: false,
        status: "not_configured",
      },
    });
  }

  const container = getCosmosContainer();
  if (!container) {
    return NextResponse.json({
      cosmos: {
        configured: true,
        status: "error",
        message: "container_unavailable",
      },
    });
  }

  try {
    const testId = `diagnostics-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const testDoc = {
      id: testId,
      type: "diagnostics",
      createdAt: new Date().toISOString(),
    };
    await container.items.create(testDoc);
    await container.item(testId, testId).delete();
    return NextResponse.json({
      cosmos: {
        configured: true,
        status: "connected",
      },
    });
  } catch (error) {
    const err = error as { code?: string | number; message?: string };
    console.error("Cosmos DB diagnostics failed", {
      code: err?.code,
      message: err?.message,
    });
    return NextResponse.json({
      cosmos: {
        configured: true,
        status: "error",
        message: err?.code ? String(err.code) : "unknown",
      },
    });
  }
}
