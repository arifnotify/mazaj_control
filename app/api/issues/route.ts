import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Issue from "@/models/Issue";
import Employee from "@/models/Employee";
import "@/models/Product";

const MARKETPLACES = ["Talabat", "Snoonu", "Rafeeq", "Keeta"] as const;

const ISSUE_TYPES = [
  "price",
  "name",
  "description",
  "image",
  "category",
  "availability",
  "other",
] as const;

// Populate the complete Product document so fields such as `image` are included
// in the response, provided they exist in the Product schema.
const populateIssueDetails = (query: any) =>
  query.populate({ path: "productId" }).populate({ path: "reporterEmployeeId" });

export async function GET() {
  try {
    await connectDB();

    const issues = await populateIssueDetails(
      Issue.find().sort({ createdAt: -1 })
    ).lean();

    return NextResponse.json(issues, { status: 200 });
  } catch (error) {
    console.error("GET /api/issues error:", error);

    return NextResponse.json(
      { message: "Failed to fetch issues" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      productId,
      marketplace,
      type,
      note = "",
      reporterEmployeeId,
    } = body ?? {};

    // Required-field validation
    if (!productId || !marketplace || !type || !reporterEmployeeId) {
      return NextResponse.json(
        {
          message:
            "Product, marketplace, issue type, and employee are required.",
        },
        { status: 400 }
      );
    }

    // Validate MongoDB IDs
    if (
      !mongoose.isValidObjectId(productId) ||
      !mongoose.isValidObjectId(reporterEmployeeId)
    ) {
      return NextResponse.json(
        { message: "Invalid product or employee ID." },
        { status: 400 }
      );
    }

    // Validate marketplace
    if (!(MARKETPLACES as readonly string[]).includes(marketplace)) {
      return NextResponse.json(
        { message: "Invalid marketplace." },
        { status: 400 }
      );
    }

    // Validate issue type
    if (!(ISSUE_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json(
        { message: "Invalid issue type." },
        { status: 400 }
      );
    }

    // Check that the product exists
    const Product = mongoose.model("Product");
    const productExists = await Product.exists({ _id: productId });

    if (!productExists) {
      return NextResponse.json(
        { message: "Selected product was not found." },
        { status: 404 }
      );
    }

    // Check that the employee exists and is active
    const employee = await Employee.findById(reporterEmployeeId)
      .select("_id name active")
      .lean();

    if (!employee) {
      return NextResponse.json(
        { message: "Selected employee was not found." },
        { status: 404 }
      );
    }

    if (employee.active === false) {
      return NextResponse.json(
        { message: "This employee is inactive." },
        { status: 400 }
      );
    }

    const reporterName = String(employee.name || "").trim();

    if (!reporterName) {
      return NextResponse.json(
        { message: "The selected employee does not have a name." },
        { status: 400 }
      );
    }

    // Create the issue. Existing fields and status are preserved.
    const issue = await Issue.create({
      productId,
      marketplace,
      type,
      note: String(note ?? "").trim(),
      reporterName,
      reporterEmployeeId,
      status: "open",
    });

    // Return the saved issue with full product data (including image) and employee details.
    const savedIssue = await populateIssueDetails(
      Issue.findById(issue._id)
    ).lean();

    return NextResponse.json(savedIssue, { status: 201 });
  } catch (error) {
    console.error("POST /api/issues error:", error);

    return NextResponse.json(
      { message: "Failed to create issue." },
      { status: 500 }
    );
  }
}
