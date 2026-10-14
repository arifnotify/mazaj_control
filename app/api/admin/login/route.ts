import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminSession } from "@/lib/adminSession";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return (
    left.length === right.length &&
    timingSafeEqual(left, right)
  );
}

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    const configuredPin = process.env.ADMIN_PIN;

    if (!configuredPin) {
      return NextResponse.json(
        { error: "Admin PIN is not configured on the server" },
        { status: 500 }
      );
    }

    if (
      typeof pin !== "string" ||
      !safeEqual(pin, configuredPin)
    ) {
      return NextResponse.json(
        { error: "Incorrect Admin PIN" },
        { status: 401 }
      );
    }

    await createAdminSession();

    return NextResponse.json({
      success: true,
      message: "Admin login successful",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to log in" },
      { status: 500 }
    );
  }
}