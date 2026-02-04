import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Local storage only. Azure integration will be added later.",
  });
}
