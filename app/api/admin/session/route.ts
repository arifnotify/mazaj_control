import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/adminSession";

export async function GET() {
  const authenticated = await isAdminSessionValid();

  return NextResponse.json(
    { authenticated },
    { status: authenticated ? 200 : 401 }
  );
}