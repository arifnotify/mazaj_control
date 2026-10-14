import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import { verifyEmployeePin } from "@/lib/employeePin";

export const runtime = "nodejs";

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Session secret is not configured");
  }

  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const pin = typeof body.pin === "string" ? body.pin : "";

    if (!email || !/^\d{3}$/.test(pin)) {
      return NextResponse.json(
        { error: "Enter your email and 3-digit PIN" },
        { status: 400 }
      );
    }

    await connectDB();

    const employee = await Employee.findOne({ email })
      .select("+pinHash");

    if (
      !employee ||
      !employee.active ||
      !(await verifyEmployeePin(pin, employee.pinHash))
    ) {
      return NextResponse.json(
        { error: "Invalid credentials or inactive account" },
        { status: 401 }
      );
    }

    const token = await new SignJWT({
      role: employee.role,
      name: employee.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(employee._id.toString())
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(getSessionSecret());

    const response = NextResponse.json({
      success: true,
      employee: {
        id: employee._id.toString(),
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });

    response.cookies.set("mazaj_employee_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Employee login error:", error);

    return NextResponse.json(
      { error: "Unable to log in" },
      { status: 500 }
    );
  }
}