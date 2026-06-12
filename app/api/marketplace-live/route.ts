import { NextResponse } from "next/server";
import { fetchMarketplaceLive } from "@/lib/marketplace";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const snapshot = await fetchMarketplaceLive();
    const hasData =
      snapshot.activeCoffeeBatches > 0 ||
      snapshot.activities.length > 0 ||
      snapshot.hasOrderData;

    if (!hasData) {
      return NextResponse.json(
        {
          ...snapshot,
          error: snapshot.loadError || "Failed to load marketplace live data",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(snapshot, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load marketplace live data",
      },
      { status: 503 }
    );
  }
}
