
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "admin@mazajnuts.com";
const SENDER_EMAIL = "sales@mazajnuts.com";

export async function POST(request: NextRequest) {
  try {
    // 1. Read environment variables
    const host = process.env.ZOHO_SMTP_HOST;
    const port = Number(process.env.ZOHO_SMTP_PORT || "465");
    const email = process.env.ZOHO_EMAIL?.trim();
    const password = process.env.ZOHO_APP_PASSWORD;

    // 2. Validate configuration
    if (!host || !email || !password) {
      console.error("ZOHO SMTP CONFIGURATION ERROR", {
        hasHost: Boolean(host),
        hasEmail: Boolean(email),
        hasPassword: Boolean(password),
      });

      return NextResponse.json(
        {
          success: false,
          error: "Zoho SMTP configuration is incomplete.",
          details:
            "Check ZOHO_SMTP_HOST, ZOHO_SMTP_PORT, ZOHO_EMAIL and ZOHO_APP_PASSWORD in your environment variables.",
        },
        { status: 500 }
      );
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid SMTP port.",
        },
        { status: 500 }
      );
    }

    if (email.toLowerCase() !== SENDER_EMAIL.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: "Sender email configuration mismatch.",
          details:
            "ZOHO_EMAIL must match SENDER_EMAIL in route.ts.",
        },
        { status: 500 }
      );
    }

    // 3. Read report data
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
          success: false,
          error: "Missing report information.",
          details: "Date, subject and body are required.",
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
        {
          success: false,
          error: "Report data is too long.",
        },
        { status: 400 }
      );
    }

    // 4. Escape HTML in report content
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

    // 5. Create Zoho SMTP transporter
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

    // 6. Verify SMTP connection and authentication
    try {
      await transporter.verify();
    } catch (smtpError: unknown) {
      const err = smtpError as {
        message?: string;
        code?: string;
        command?: string;
        responseCode?: number;
        response?: string;
      };

      console.error("ZOHO SMTP VERIFY ERROR", {
        message: err.message,
        code: err.code,
        command: err.command,
        responseCode: err.responseCode,
        response: err.response,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Zoho SMTP connection or authentication failed.",
          code: err.code || null,
          responseCode: err.responseCode || null,
          details:
            process.env.NODE_ENV === "development"
              ? err.message || "Unknown SMTP verification error."
              : "Check Vercel function logs for ZOHO SMTP VERIFY ERROR.",
        },
        { status: 502 }
      );
    }

    // 7. Send email directly to Admin
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
        `Subject: ${subject}`,
        "",
        body,
      ].join("\n"),
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family:Arial,sans-serif;color:#222;line-height:1.6">
            <h2>Mazaj Control Dashboard</h2>
            <h3>Stock Receiving Report</h3>
            <p><strong>Date:</strong> ${safeDate}</p>
            <p><strong>Subject:</strong> ${safeSubject}</p>
            <hr />
            <pre style="font-family:Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere">${safeBody}</pre>
            <hr />
            <p style="font-size:12px;color:#777">
              Sent automatically by Mazaj Control Dashboard.
            </p>
          </body>
        </html>
      `,
    });

    console.log("STOCK REPORT EMAIL SENT", {
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

    // Never log SMTP passwords or other secrets.
    console.error("ZOHO SMTP ERROR", {
      message: err.message,
      code: err.code,
      command: err.command,
      responseCode: err.responseCode,
      response: err.response,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Zoho email sending failed.",
        code: err.code || null,
        responseCode: err.responseCode || null,
        details:
          process.env.NODE_ENV === "development"
            ? err.message || "Unknown error."
            : "Check Vercel function logs for ZOHO SMTP ERROR.",
      },
      { status: 500 }
    );
  }
}