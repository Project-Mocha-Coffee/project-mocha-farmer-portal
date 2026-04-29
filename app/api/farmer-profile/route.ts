import { NextRequest, NextResponse } from "next/server";
import { fetchLiveFarmerProfile } from "@/lib/elementpay";

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get("phone");
    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    const profile = await fetchLiveFarmerProfile(phone);
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load live profile",
      },
      { status: 502 }
    );
  }
}
