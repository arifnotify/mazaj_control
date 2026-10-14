import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import { isAdminSessionValid } from "@/lib/adminSession";
import {
  hashEmployeePin,
  isValidEmployeePin,
} from "@/lib/employeePin";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json(
      { error: "Admin authentication required" },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const employees = await Employee.find({})
      .select("-pinHash")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(employees);
  } catch {
    return NextResponse.json(
      { error: "Failed to load employees" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json(
      { error: "Admin authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const role = body.role;
    const pin = body.pin;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    if (!["admin", "manager", "employee"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    if (!isValidEmployeePin(pin)) {
      return NextResponse.json(
        { error: "Employee PIN must contain exactly 3 digits" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await Employee.findOne({ email });

    if (existing) {
      return NextResponse.json(
        { error: "An employee with this email already exists" },
        { status: 409 }
      );
    }

    const employee = await Employee.create({
      name,
      email,
      phone,
      role,
      active: true,
      pinHash: await hashEmployeePin(pin),
    });

    return NextResponse.json(
      {
        success: true,
        employee: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          role: employee.role,
          active: employee.active,
          createdAt: employee.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "An employee with this email already exists" },
        { status: 409 }
      );
    }

    console.error("Create employee error:", error);

    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}