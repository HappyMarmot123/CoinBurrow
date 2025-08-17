import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET() {
  try {
    const sessionToken = jwt.sign({}, process.env.JWT_SECRET_KEY!, {
      expiresIn: "5m",
    });

    return NextResponse.json({ sessionToken });
  } catch (error) {
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
