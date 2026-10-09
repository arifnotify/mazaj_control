
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Issue from "@/models/Issue";
import Employee from "@/models/Employee";
import "@/models/Product";

const MARKETPLACES = ["Talabat", "Snoonu", "Rafeeq", "Keeta"];

const ISSUE_TYPES = [
  "price",
  "name",
  "description",
  "image",
  "category",
  "availability",
  "other",
];

export async function GET() {
  try {
    await connectDB();

    const issues = await Issue.find()
      .populate("productId")
      .populate("reporterEmployeeId")
      .sort({ createdAt: -1 })
      .lean();

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
    } = body;

    // Required-field validation
    if (
      !productId ||
      !marketplace ||
      !type ||
      !reporterEmployeeId
    ) {
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
    if (!MARKETPLACES.includes(marketplace)) {
      return NextResponse.json(
        { message: "Invalid marketplace." },
        { status: 400 }
      );
    }

    // Validate issue type
    if (!ISSUE_TYPES.includes(type)) {
      return NextResponse.json(
        { message: "Invalid issue type." },
        { status: 400 }
      );
    }

    // Check that the employee exists
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

    // Create the issue
    const issue = await Issue.create({
      productId,
      marketplace,
      type,
      note: String(note).trim(),
      reporterName,
      reporterEmployeeId,
      status: "open",
    });

    // Return the saved issue with product and employee details
    const savedIssue = await Issue.findById(issue._id)
      .populate("productId")
      .populate("reporterEmployeeId")
      .lean();

    return NextResponse.json(savedIssue, { status: 201 });
  } catch (error) {
    console.error("POST /api/issues error:", error);

    return NextResponse.json(
      { message: "Failed to create issue." },
      { status: 500 }
    );
  }
}