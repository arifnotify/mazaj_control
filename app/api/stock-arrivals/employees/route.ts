import { NextRequest, NextResponse } from "next/server";
import {
  randomBytes,
  scryptSync,
} from "crypto";

import { connectDB } from "@/lib/mongodb";
import StockArrivalEmployee from "@/models/StockArrivalEmployee";

function hashPin(pin: string, salt: string) {
  return scryptSync(pin, salt, 64).toString("hex");
}

export async function GET() {
  try {
    await connectDB();

    const employees = await StockArrivalEmployee.find({ active: true })
      .select("_id name")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ employees });
  } catch {
    return NextResponse.json(
      { message: "Failed to load employees." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminKey = process.env.STOCK_ARRIVAL_ADMIN_KEY;
    const suppliedKey = request.headers.get("x-admin-key");

    if (!adminKey || suppliedKey !== adminKey) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const name = String(body.name || "").trim();
    const pin = String(body.pin || "");

    if (!name || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json(
        { message: "Name and a 4–8 digit PIN are required." },
        { status: 400 }
      );
    }

    const salt = randomBytes(16).toString("hex");
    const pinHash = `${salt}:${hashPin(pin, salt)}`;

    const employee = await StockArrivalEmployee.create({
      name,
      pinHash,
      active: true,
    });

    return NextResponse.json(
      {
        success: true,
        employee: {
          _id: employee._id,
          name: employee.name,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "An employee with this name already exists." },
        { status: 409 }
      );
    }

    console.error("Employee registration:", error);
    return NextResponse.json(
      { message: "Failed to register employee." },
      { status: 500 }
    );
  }
}