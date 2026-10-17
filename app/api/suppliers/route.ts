
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Supplier from "@/models/Supplier";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const suppliers = await Supplier.find({ active: true })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, suppliers });
  } catch (error) {
    console.error("Suppliers GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const type = data.type === "market" ? "market" : "regular";

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Supplier name is required" },
        { status: 400 }
      );
    }

    const supplier = await Supplier.create({
      name,
      type,
      contactPerson:
        typeof data.contactPerson === "string" ? data.contactPerson.trim() : "",
      phone: typeof data.phone === "string" ? data.phone.trim() : "",
      email: typeof data.email === "string" ? data.email.trim() : "",
      marketName:
        typeof data.marketName === "string" ? data.marketName.trim() : "",
      address: typeof data.address === "string" ? data.address.trim() : "",
      notes: typeof data.notes === "string" ? data.notes.trim() : "",
    });

    return NextResponse.json(
      { success: true, supplier },
      { status: 201 }
    );
  } catch (error) {
    console.error("Suppliers POST error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
