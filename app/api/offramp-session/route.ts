import { NextRequest, NextResponse } from "next/server";
import { createOffRampSession } from "@/lib/elementpay";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      phone?: string;
      walletAddress?: string;
      amount?: number;
      currency?: "KES" | "USD";
    };

    if (!body.phone || !body.walletAddress || !body.amount || !body.currency) {
      return NextResponse.json(
        { error: "phone, walletAddress, amount, and currency are required" },
        { status: 400 }
      );
    }

    const session = await createOffRampSession({
      phone: body.phone,
      walletAddress: body.walletAddress,
      amount: body.amount,
      currency: body.currency,
    });

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create off-ramp session",
      },
      { status: 502 }
    );
  }
}
