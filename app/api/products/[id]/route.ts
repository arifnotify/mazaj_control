import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { verifyEmployeePin } from "@/lib/employeePin";

import Product from "@/models/Product";
import Employee from "@/models/Employee";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/products/[id]
 * Get one product.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid product ID", 400);
    }

    const product = await Product.findById(id).lean();

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("GET product error:", error);

    return errorResponse("Failed to load product", 500);
  }
}

/**
 * PUT /api/products/[id]
 * Update a product.
 *
 * If active status changes, employee ID and employee PIN are required.
 * The employee PIN is checked against the stored PIN hash.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid product ID", 400);
    }

    const body = await request.json();

    const product = await Product.findById(id);

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    // Only update fields that are explicitly provided.
    const allowedFields = [
      "sku",
      "name",
      "nameEn",
      "nameAr",
      "nameBn",
      "description",
      "descriptionEn",
      "descriptionAr",
      "descriptionBn",
      "image",
      "category",
      "categoryEn",
      "categoryAr",
      "categoryBn",
      "price",
      "stock",
      "productType",
      "weights",
      "variants",
    ] as const;

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        (product as any)[field] = body[field];
      }
    }

    // Validate fields if supplied.
    if (
      body.sku !== undefined &&
      (typeof body.sku !== "string" || !body.sku.trim())
    ) {
      return errorResponse("SKU is required", 400);
    }

    if (
      body.price !== undefined &&
      (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)
    ) {
      return errorResponse("Price must be a valid non-negative number", 400);
    }

    if (
      body.stock !== undefined &&
      (!Number.isFinite(Number(body.stock)) || Number(body.stock) < 0)
    ) {
      return errorResponse("Stock must be a valid non-negative number", 400);
    }

    /*
     * Status change verification.
     *
     * The frontend should send:
     * {
     *   "active": false,
     *   "statusEmployeeId": "...",
     *   "employeePin": "007"
     * }
     */
    const changingStatus =
      typeof body.active === "boolean" && body.active !== product.active;

    if (changingStatus) {
      const employeeId =
        typeof body.statusEmployeeId === "string"
          ? body.statusEmployeeId.trim()
          : "";

      // Keep PIN as a string so leading zeros are preserved.
      const employeePin =
        typeof body.employeePin === "string" ? body.employeePin : "";

      if (!employeeId || !isValidObjectId(employeeId)) {
        return errorResponse("Please select a valid employee", 400);
      }

      if (!/^\d{3}$/.test(employeePin)) {
        return errorResponse(
          "Employee PIN must contain exactly 3 digits",
          400
        );
      }

      // Explicitly select pinHash if the Employee schema uses select: false.
      const employee = await Employee.findOne({
        _id: employeeId,
        active: { $ne: false },
      }).select("+pinHash");

      if (!employee || !employee.name?.trim()) {
        return errorResponse("Employee not found or inactive", 400);
      }

      if (typeof employee.pinHash !== "string" || !employee.pinHash) {
        return errorResponse(
          "This employee does not have a PIN configured. Please contact the admin.",
          400
        );
      }

      // IMPORTANT: argument order is PIN first, stored hash second.
      const pinIsValid = await verifyEmployeePin(
        employeePin,
        employee.pinHash
      );

      if (!pinIsValid) {
        return errorResponse("Incorrect employee PIN", 401);
      }

      // PIN verified: record the status change.
      product.active = body.active;

      (product as any).lastStatusChangedById = employee._id;
      (product as any).lastStatusChangedByName = employee.name;
      (product as any).lastStatusChangedAt = new Date();

      const statusHistory = Array.isArray((product as any).statusHistory)
        ? (product as any).statusHistory
        : [];

      statusHistory.push({
        active: body.active,
        employeeId: employee._id,
        employeeName: employee.name,
        changedAt: new Date(),
      });

      (product as any).statusHistory = statusHistory;
    } else if (typeof body.active === "boolean") {
      // Status was supplied but did not change.
      product.active = body.active;
    }

    await product.save();

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error: any) {
    console.error("PUT product error:", error);

    if (error?.code === 11000) {
      return errorResponse("This SKU already exists", 409);
    }

    if (error?.name === "ValidationError") {
      return errorResponse(error.message, 400);
    }

    return errorResponse("Failed to update product", 500);
  }
}

/**
 * DELETE /api/products/[id]
 * Delete one product.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid product ID", 400);
    }

    const product = await Product.findById(id);

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    await Product.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("DELETE product error:", error);

    return errorResponse("Failed to delete product", 500);
  }
}