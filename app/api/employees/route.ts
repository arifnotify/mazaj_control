import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

export async function GET() {
  try {
    await connectDB();

    const employees = await Employee.find()
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

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const phone = String(body.phone || "").trim();

    const role = body.role || "employee";

    if (!name) {
      return NextResponse.json(
        { error: "Employee name is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Employee email is required" },
        { status: 400 }
      );
    }

    const validRoles = [
      "admin",
      "manager",
      "employee",
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid employee role" },
        { status: 400 }
      );
    }

    const existingEmployee = await Employee.findOne({
      email,
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: "Employee with this email already exists" },
        { status: 409 }
      );
    }

    const employee = await Employee.create({
      name,
      email,
      phone,
      role,
      active: true,
    });

    return NextResponse.json(employee, {
      status: 201,
    });
  } catch (error) {
    console.error("CREATE EMPLOYEE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}