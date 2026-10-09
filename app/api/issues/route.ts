
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Issue from "@/models/Issue";
import Employee from "@/models/Employee";
import "@/models/Product";

const validMarketplaces = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
];

const validTypes = [
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

    return NextResponse.json(issues);
  } catch (error) {
    console.error("GET issues error:", error);

    return NextResponse.json(
      { message: "Failed to load issues." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    const productId = String(body.productId || "").trim();
    const reporterEmployeeId = String(
      body.reporterEmployeeId || ""
    ).trim();
    const marketplace = String(body.marketplace || "").trim();
    const type = String(body.type || "").trim();
    const note =
      typeof body.note === "string" ? body.note.trim() : "";

    if (
      !mongoose.isValidObjectId(productId) ||
      !mongoose.isValidObjectId(reporterEmployeeId) ||
      !marketplace ||
      !type
    ) {
      return NextResponse.json(
        { message: "Please provide all required fields." },
        { status: 400 }
      );
    }

    if (
      !validMarketplaces.includes(marketplace) ||
      !validTypes.includes(type)
    ) {
      return NextResponse.json(
        { message: "Invalid marketplace or issue type." },
        { status: 400 }
      );
    }

    if (note.length > 2000) {
      return NextResponse.json(
        { message: "Note cannot exceed 2000 characters." },
        { status: 400 }
      );
    }

    const employee = await Employee.findById(
      reporterEmployeeId
    ).select("_id name").lean();

    if (!employee) {
      return NextResponse.json(
        { message: "Selected employee was not found." },
        { status: 404 }
      );
    }

    const reporterName = String(employee.name || "").trim();

    if (!reporterName) {
      return NextResponse.json(
        { message: "Selected employee has no name." },
        { status: 400 }
      );
    }

    const issue = await Issue.create({
      productId,
      marketplace,
      type,
      note,
      reporterName,
      reporterEmployeeId: employee._id,
      status: "open",
    });

    const savedIssue = await Issue.findById(issue._id)
      .populate("productId")
      .populate("reporterEmployeeId")
      .lean();

    return NextResponse.json(savedIssue, { status: 201 });
  } catch (error) {
    console.error("POST issue error:", error);

    return NextResponse.json(
      { message: "Failed to create issue." },
      { status: 500 }
    );
  }
}