import { NextResponse } from "next/server";

import { checkRateLimit, getRequestKey } from "../../_lib/rate-limit";
import { errorJson, handleRouteError } from "../../_lib/responses";
import { validateSearchQuery } from "../../_lib/validation";
import { searchBarangays } from "@/lib/territory-data";

const SEARCH_LIMIT = 60;
const SEARCH_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  const requestKey = getRequestKey(request);
  if (!checkRateLimit(requestKey, SEARCH_LIMIT, SEARCH_WINDOW_MS)) {
    return errorJson("Search rate limit exceeded. Try again shortly.", 429);
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = validateSearchQuery(searchParams.get("q"));

    if (!q) {
      return errorJson("Invalid query. `q` is required and must be between 2 and 80 characters.", 400);
    }

    const data = await searchBarangays(q);
    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
