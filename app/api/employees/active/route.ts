
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();

    const employees = await Employee.find({ active: true })
      .select("_id name active")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      employees: employees.map((employee) => ({
        _id: String(employee._id),
        name: employee.name,
        active: employee.active,
      })),
    });
  } catch (error) {
    console.error("Active employees API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load employees",
      },
      { status: 500 }
    );
  }
}
