
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "admin@mazajnuts.com";
const SENDER_EMAIL = "sales@mazajnuts.com";

export async function POST(request: NextRequest) {
  try {
    // Check required SMTP settings
    const host = process.env.ZOHO_SMTP_HOST;
    const port = Number(process.env.ZOHO_SMTP_PORT || 465);
    const email = process.env.ZOHO_EMAIL;
    const password = process.env.ZOHO_APP_PASSWORD;

    if (!host || !email || !password) {
      console.error("Zoho SMTP configuration is incomplete.", {
        hasHost: Boolean(host),
        hasEmail: Boolean(email),
        hasPassword: Boolean(password),
      });

      return NextResponse.json(
        {
          error:
            "Zoho SMTP configuration is incomplete. Check your Vercel environment variables.",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      return NextResponse.json(
        { error: "Invalid Zoho SMTP port." },
        { status: 500 }
      );
    }

    if (email.toLowerCase() !== SENDER_EMAIL.toLowerCase()) {
      return NextResponse.json(
        {
          error:
            "ZOHO_EMAIL must match the configured sender address.",
        },
        { status: 500 }
      );
    }

    // Read report information
    const data = await request.json();

    const date =
      typeof data.date === "string" ? data.date.trim() : "";

    const subject =
      typeof data.subject === "string"
        ? data.subject.trim()
        : "";

    const body =
      typeof data.body === "string" ? data.body.trim() : "";

    if (!date || !subject || !body) {
      return NextResponse.json(
        {
          error: "Date, subject, and report body are required.",
        },
        { status: 400 }
      );
    }

    if (
      date.length > 100 ||
      subject.length > 200 ||
      body.length > 50000
    ) {
      return NextResponse.json(
        { error: "The report contains fields that are too long." },
        { status: 400 }
      );
    }

    // Prevent HTML injection by escaping the report text.
    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };

        return entities[character];
      });

    const safeDate = escapeHtml(date);
    const safeSubject = escapeHtml(subject);
    const safeBody = escapeHtml(body);

    // Configure Zoho SMTP
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

    // Send the report directly to the admin.
    // The recipient is fixed and cannot be changed by the request.
    const result = await transporter.sendMail({
      from: {
        name: "Mazaj Control Dashboard",
        address: SENDER_EMAIL,
      },
      to: ADMIN_EMAIL,
      subject: `${subject} - ${date}`,
      text: [
        "Mazaj Control Dashboard",
        "Stock Receiving Report",
        `Date: ${date}`,
        "",
        body,
      ].join("\n"),
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; color: #222; line-height: 1.6;">
            <h2>Mazaj Control Dashboard</h2>
            <h3>Stock Receiving Report</h3>
            <p><strong>Date:</strong> ${safeDate}</p>
            <p><strong>Subject:</strong> ${safeSubject}</p>
            <hr />
            <pre style="font-family: Arial, sans-serif; white-space: pre-wrap; overflow-wrap: anywhere;">${safeBody}</pre>
            <hr />
            <p style="font-size: 12px; color: #777;">
              Sent automatically by Mazaj Control Dashboard.
            </p>
          </body>
        </html>
      `,
    });

    console.log("Stock receiving report email sent.", {
      messageId: result.messageId,
      recipient: ADMIN_EMAIL,
    });

    return NextResponse.json({
      success: true,
      message: "Report email sent successfully to Admin.",
      messageId: result.messageId,
    });
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      code?: string;
      command?: string;
      responseCode?: number;
      response?: string;
    };

    // Never log SMTP credentials or passwords.
    console.error("ZOHO SMTP ERROR:", {
      message: err.message,
      code: err.code,
      command: err.command,
      responseCode: err.responseCode,
      response: err.response,
    });

    const details =
      process.env.NODE_ENV === "development"
        ? err.message || "Unknown SMTP error."
        : undefined;

    return NextResponse.json(
      {
        success: false,
        error: "Zoho email sending failed.",
        details,
        code: err.code || undefined,
      },
      { status: 500 }
    );
  }
}