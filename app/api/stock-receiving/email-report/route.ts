import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const DEFAULT_RECIPIENT = "admin@mazajnuts.com";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const host = process.env.ZOHO_SMTP_HOST;
    const port = Number(process.env.ZOHO_SMTP_PORT || 465);
    const email = process.env.ZOHO_EMAIL;
    const password = process.env.ZOHO_APP_PASSWORD;

    if (!host || !email || !password) {
      return NextResponse.json(
        {
          error:
            "Zoho SMTP is not configured. Check your environment variables.",
        },
        { status: 500 }
      );
    }

    if (port !== 465 && port !== 587) {
      return NextResponse.json(
        { error: "SMTP port must be 465 or 587." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const date = String(body.date || "").trim();
    const subject = String(body.subject || "").trim();
    const reportBody = String(body.body || "").trim();
    const recipient = String(
      body.to || DEFAULT_RECIPIENT
    ).trim();

    // Validate recipient email
    if (!isValidEmail(recipient)) {
      return NextResponse.json(
        { error: "Please enter a valid recipient email address." },
        { status: 400 }
      );
    }

    // Validate date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return NextResponse.json(
        { error: "Invalid report date." },
        { status: 400 }
      );
    }

    if (!subject || !reportBody) {
      return NextResponse.json(
        { error: "Subject and report body are required." },
        { status: 400 }
      );
    }

    if (subject.length > 200 || reportBody.length > 100_000) {
      return NextResponse.json(
        { error: "The subject or report is too large." },
        { status: 413 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: email,
        pass: password,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    const result = await transporter.sendMail({
      from: {
        name: "Mazaj Stock Reports",
        address: email,
      },
      to: recipient,
      subject,
      text: reportBody,
    });

    return NextResponse.json({
      success: true,
      message: `Report email submitted to ${recipient}.`,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("STOCK RECEIVING EMAIL ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Email sending failed. Check Zoho SMTP settings and credentials.",
      },
      { status: 500 }
    );
  }
}