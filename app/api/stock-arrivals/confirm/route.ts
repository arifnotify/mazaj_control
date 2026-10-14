import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import StockArrival from "@/models/StockArrival";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { arrivalId, employeeId, pin, marketplaces } = body;

    if (
      !mongoose.isValidObjectId(arrivalId) ||
      !mongoose.isValidObjectId(employeeId) ||
      typeof pin !== "string" ||
      !pin.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid confirmation details" },
        { status: 400 }
      );
    }

    const requiredMarketplaces = [
      "talabat",
      "snoonu",
      "rafeeq",
      "keeta",
    ];

    if (
      !marketplaces ||
      !requiredMarketplaces.every(
        (key) => marketplaces[key] === true
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Confirm that all four marketplaces are active",
        },
        { status: 400 }
      );
    }

    // Uses the existing Employees collection.
    const employee: any = await Employee.findById(employeeId).select(
      "+pinHash name active"
    );

    if (!employee || employee.active === false || !employee.pinHash) {
      return NextResponse.json(
        { success: false, message: "Employee is inactive or not found" },
        { status: 401 }
      );
    }

    const validPin = await bcrypt.compare(pin, employee.pinHash);

    if (!validPin) {
      return NextResponse.json(
        { success: false, message: "Incorrect PIN" },
        { status: 401 }
      );
    }

    const arrival: any = await StockArrival.findById(arrivalId);

    if (!arrival) {
      return NextResponse.json(
        { success: false, message: "Stock arrival not found" },
        { status: 404 }
      );
    }

    if (arrival.status === "completed") {
      return NextResponse.json(
        { success: false, message: "This arrival is already completed" },
        { status: 409 }
      );
    }

    arrival.marketplaceConfirmation = {
      talabat: true,
      snoonu: true,
      rafeeq: true,
      keeta: true,
    };

    arrival.status = "completed";
    arrival.confirmedBy = employee._id;
    arrival.confirmedByName = employee.name;
    arrival.confirmedAt = new Date();

    await arrival.save();

    return NextResponse.json({
      success: true,
      message: "Stock arrival confirmed",
      arrival,
    });
  } catch (error) {
    console.error("Stock arrival confirmation error:", error);
    return NextResponse.json(
      { success: false, message: "Confirmation failed" },
      { status: 500 }
    );
  }
}