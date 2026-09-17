import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email, name, pin } = await req.json();

    if (!email || !pin) {
      return NextResponse.json(
        { success: false, error: "Missing email or PIN" },
        { status: 400 }
      );
    }

    const gmailUser = process.env.GMAIL_USER || process.env.NEXT_PUBLIC_GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.NEXT_PUBLIC_GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      const cleanPass = gmailPass.replace(/\s+/g, "");
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // SSL
        auth: {
          user: gmailUser,
          pass: cleanPass,
        },
      });

      await transporter.sendMail({
        from: `"SOFEA Tabulation System" <${gmailUser}>`,
        to: email,
        subject: "🔒 Your SOFEA Permanent PIN Passcode",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e3a8a; margin-top: 0;">SOFEA Digital Tabulation System</h2>
            <p style="font-size: 15px; color: #334155;">Hello <strong>${name}</strong>,</p>
            <p style="font-size: 15px; color: #334155;">Your identity has been verified for the SOFEA Tabulation System.</p>
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
              <span style="font-size: 14px; color: #1e40af; display: block; margin-bottom: 5px;">Your Permanent 4-Digit PIN Passcode:</span>
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e3a8a; font-family: monospace;">${pin}</span>
            </div>
            <p style="font-size: 13px; color: #64748b;">Please enter this 4-digit PIN code on the portal landing screen to access your judge workspace. Keep this PIN code secure.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 20px;" />
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">College of Teacher Education · Society of Future Educators and Administrators · University of Cebu Lapu-Lapu and Mandaue</p>
          </div>
        `,
      });
      console.log(`[SOFEA Tabulation] Email successfully sent to ${email}`);
    } else {
      console.log(
        `[SOFEA Tabulation System — Dev Dispatch Log]\nTo: ${name} <${email}>\nSubject: Your SOFEA Permanent PIN Passcode\nContent: Your permanent PIN passcode is: ${pin}\n`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Verification email containing 4-digit PIN sent to ${email}`,
    });
  } catch (err: any) {
    console.error("Nodemailer error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to dispatch email" },
      { status: 500 }
    );
  }
}
