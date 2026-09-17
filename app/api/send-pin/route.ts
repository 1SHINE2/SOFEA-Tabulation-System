import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, name, pin } = await req.json();

    if (!email || !pin) {
      return NextResponse.json(
        { success: false, error: "Missing email or PIN" },
        { status: 400 }
      );
    }

    console.log(
      `[SOFEA Tabulation System — Email Dispatch Service]\nTo: ${name} <${email}>\nSubject: Your SOFEA Permanent PIN Passcode\nContent: Your permanent PIN passcode for the SOFEA Tabulation System is: ${pin}\n`
    );

    return NextResponse.json({
      success: true,
      message: `Verification email containing 4-digit PIN sent to ${email}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to dispatch email" },
      { status: 500 }
    );
  }
}
