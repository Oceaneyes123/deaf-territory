import { NextResponse } from "next/server";

const DEFAULT_ERROR_MESSAGE = "Internal server error.";

export function errorJson(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(error: unknown): NextResponse {
  console.error(error);

  if (error instanceof Error && /DATABASE_URL/i.test(error.message)) {
    return errorJson(error.message, 500);
  }

  return errorJson(DEFAULT_ERROR_MESSAGE, 500);
}
