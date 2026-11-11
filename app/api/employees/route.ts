
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

    const employees = await Employee.find()
      .select("-pinHash")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(employees);
  } catch (error) {
    console.error("GET EMPLOYEES ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Admin authentication
  if (!(await isAdminSessionValid())) {
    return NextResponse.json(
      { error: "Admin authentication required" },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const role = body.role || "employee";
    const pin = body.pin;

    // Name validation
    if (!name) {
      return NextResponse.json(
        { error: "Employee name is required" },
        { status: 400 }
      );
    }

    // Email validation
    if (!email) {
      return NextResponse.json(
        { error: "Employee email is required" },
        { status: 400 }
      );
    }

    // Role validation
    if (
      !["admin", "manager", "employee"].includes(role)
    ) {
      return NextResponse.json(
        { error: "Invalid employee role" },
        { status: 400 }
      );
    }

    // PIN validation
    if (!isValidEmployeePin(pin)) {
      return NextResponse.json(
        {
          error: "PIN must contain exactly 3 digits",
        },
        { status: 400 }
      );
    }

    // Check duplicate email
    const existingEmployee = await Employee.findOne({
      email,
    });

    if (existingEmployee) {
      return NextResponse.json(
        {
          error: "Employee with this email already exists",
        },
        { status: 409 }
      );
    }

    // Hash employee PIN
    const pinHash = await hashEmployeePin(pin);

    // Create employee
    const employee = await Employee.create({
      name,
      email,
      phone,
      role,
      active: true,
      pinHash,
    });

    // Remove PIN hash from response
    const safeEmployee = employee.toObject();

    delete safeEmployee.pinHash;

    return NextResponse.json(
      {
        success: true,
        message: "Employee successfully created",
        employee: safeEmployee,
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error("CREATE EMPLOYEE ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    // Duplicate MongoDB index
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          error: "Employee with this email already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create employee",
        details: message,
      },
      { status: 500 }
    );
  }
}
