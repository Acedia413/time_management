import { NextResponse } from "next/server";

export function GET() {
  const fallback =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:3001";

  return NextResponse.json({
    apiUrl: fallback,
  });
}
