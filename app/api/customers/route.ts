import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";

export const dynamic = "force-dynamic";

function normalizeWhatsApp(value: string) {
  return value.replace(/\D/g, "");
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const search = request.nextUrl.searchParams.get("search")?.trim();

    const filter: Record<string, unknown> = {};

    if (search) {
      const normalized = normalizeWhatsApp(search);

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { whatsapp: { $regex: normalized || search, $options: "i" } },
      ];
    }

    const customers = await Customer.find(filter)
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Customer GET error:", error);
    return NextResponse.json(
      { error: "Could not load customers." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const name = String(body.name || "").trim();
    const whatsapp = normalizeWhatsApp(String(body.whatsapp || ""));

    if (!name || whatsapp.length < 7) {
      return NextResponse.json(
        { error: "Valid customer name and WhatsApp number are required." },
        { status: 400 }
      );
    }

    const customer = await Customer.findOneAndUpdate(
      { whatsapp },
      {
        $set: {
          name,
          address: String(body.address || "").trim(),
          area: String(body.area || "").trim(),
          notes: String(body.notes || ""),
        },
        $setOnInsert: {
          whatsapp,
          totalOrders: 0,
          totalSpent: 0,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return NextResponse.json({
      customer,
      created: customer.totalOrders === 0,
    });
  } catch (error) {
    console.error("Customer POST error:", error);
    return NextResponse.json(
      { error: "Could not save customer." },
      { status: 500 }
    );
  }
}