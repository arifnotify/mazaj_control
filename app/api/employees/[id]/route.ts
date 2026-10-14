import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import { isAdminSessionValid } from "@/lib/adminSession";
import {
  hashEmployeePin,
  isValidEmployeePin,
} from "@/lib/employeePin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json(
      { error: "Admin authentication required" },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { error: "Name is required" },
          { status: 400 }
        );
      }
      update.name = body.name.trim();
    }

    if (body.email !== undefined) {
      if (
        typeof body.email !== "string" ||
        !body.email.trim()
      ) {
        return NextResponse.json(
          { error: "Valid email is required" },
          { status: 400 }
        );
      }
      update.email = body.email.trim().toLowerCase();
    }

    if (body.phone !== undefined) {
      if (typeof body.phone !== "string") {
        return NextResponse.json(
          { error: "Invalid phone" },
          { status: 400 }
        );
      }
      update.phone = body.phone.trim();
    }

    if (body.role !== undefined) {
      if (
        !["admin", "manager", "employee"].includes(body.role)
      ) {
        return NextResponse.json(
          { error: "Invalid role" },
          { status: 400 }
        );
      }
      update.role = body.role;
    }

    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") {
        return NextResponse.json(
          { error: "Invalid active status" },
          { status: 400 }
        );
      }
      update.active = body.active;
    }

    // Only Admin can reset the employee PIN.
    if (body.pin !== undefined) {
      if (!isValidEmployeePin(body.pin)) {
        return NextResponse.json(
          { error: "PIN must contain exactly 3 digits" },
          { status: 400 }
        );
      }
      update.pinHash = await hashEmployeePin(body.pin);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid changes provided" },
        { status: 400 }
      );
    }

    await connectDB();

    const employee = await Employee.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).select("-pinHash");

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee,
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "Email already belongs to another employee" },
        { status: 409 }
      );
    }

    console.error("Update employee error:", error);

    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json(
      { error: "Admin authentication required" },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete employee error:", error);

    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}