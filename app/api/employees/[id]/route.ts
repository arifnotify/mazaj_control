import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

const validRoles = [
  "admin",
  "manager",
  "employee",
];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const name =
      body.name !== undefined
        ? String(body.name).trim()
        : undefined;

    const email =
      body.email !== undefined
        ? String(body.email).trim().toLowerCase()
        : undefined;

    const phone =
      body.phone !== undefined
        ? String(body.phone).trim()
        : undefined;

    const role =
      body.role !== undefined
        ? String(body.role)
        : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: "Employee name is required" },
        { status: 400 }
      );
    }

    if (email !== undefined && !email) {
      return NextResponse.json(
        { error: "Employee email is required" },
        { status: 400 }
      );
    }

    if (
      role !== undefined &&
      !validRoles.includes(role)
    ) {
      return NextResponse.json(
        { error: "Invalid employee role" },
        { status: 400 }
      );
    }

    if (email !== undefined) {
      const duplicate = await Employee.findOne({
        email,
        _id: { $ne: id },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            error:
              "Another employee already uses this email",
          },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (email !== undefined) {
      updateData.email = email;
    }

    if (phone !== undefined) {
      updateData.phone = phone;
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    if (body.active !== undefined) {
      updateData.active = Boolean(body.active);
    }

    const employee =
      await Employee.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error(
      "UPDATE EMPLOYEE ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const employee =
      await Employee.findByIdAndDelete(id);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE EMPLOYEE ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}