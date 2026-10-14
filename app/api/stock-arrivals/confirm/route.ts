import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import StockArrival from "@/models/StockArrival";
import { verifyEmployeePin } from "@/lib/employeePin";

export const runtime = "nodejs";

const REQUIRED_MARKETPLACES = [
  "talabat",
  "snoonu",
  "rafeeq",
  "keeta",
] as const;

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { arrivalId, employeeId, pin, marketplaces } = body;

    // Validate IDs and the 3-digit PIN.
    if (
      !mongoose.isValidObjectId(arrivalId) ||
      !mongoose.isValidObjectId(employeeId) ||
      typeof pin !== "string" ||
      !/^\d{3}$/.test(pin)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid confirmation details",
        },
        { status: 400 }
      );
    }

    // All four marketplaces must be checked.
    if (
      !marketplaces ||
      !REQUIRED_MARKETPLACES.every(
        (key) => marketplaces[key] === true
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Confirm all four marketplaces",
        },
        { status: 400 }
      );
    }

    // Use the existing Employees collection.
    const employee = await Employee.findById(employeeId)
      .select("+pinHash name active")
      .exec();

    if (!employee || !employee.active || !employee.pinHash) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee is inactive or PIN is not configured",
        },
        { status: 401 }
      );
    }

    // IMPORTANT: Verify with the same scrypt method used to hash the PIN.
    const validPin = await verifyEmployeePin(pin, employee.pinHash);

    if (!validPin) {
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect PIN",
        },
        { status: 401 }
      );
    }

    const arrival = await StockArrival.findById(arrivalId);

    if (!arrival) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock arrival not found",
        },
        { status: 404 }
      );
    }

    if (arrival.status === "completed") {
      return NextResponse.json(
        {
          success: false,
          message: "This arrival is already completed",
        },
        { status: 409 }
      );
    }

    // One valid PIN confirms all four marketplaces together.
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
      message: "All four marketplaces confirmed successfully",
      arrival,
    });
  } catch (error) {
    console.error("Stock arrival confirmation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Confirmation failed",
      },
      { status: 500 }
    );
  }
}