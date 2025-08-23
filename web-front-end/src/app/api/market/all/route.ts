import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error("Backend URL is not defined in environment variables.");
    }

    const response = await fetch(`${backendUrl}/market/all`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const initialMarkets = await response.json();
    return NextResponse.json(initialMarkets);
  } catch (error) {
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
