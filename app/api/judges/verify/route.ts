import { NextResponse } from "next/server";

/**
 * POST /api/judges/verify — validates a shared access code server-side.
 *
 * Compares the submitted code against JUDGE_ACCESS_CODE env var.
 * Returns 200 on match (client sets the cookie), 401 on mismatch.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string };
  const expected = process.env.JUDGE_ACCESS_CODE;

  if (!expected) {
    return NextResponse.json(
      { error: "Judge access is not configured" },
      { status: 503 },
    );
  }

  if (!body.code || body.code !== expected) {
    return NextResponse.json(
      { error: "Invalid access code" },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
