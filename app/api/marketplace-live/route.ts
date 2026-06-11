import { NextResponse } from "next/server";
import { fetchMarketplaceLive } from "@/lib/marketplace";

export async function GET() {
  try {
    const snapshot = await fetchMarketplaceLive();
    return NextResponse.json(snapshot, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load marketplace live data",
      },
      { status: 502 }
    );
  }
}
