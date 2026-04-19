import { NextResponse } from "next/server";

import { enforcePayloadSizeLimit } from "../../_lib/geometry";
import { errorJson, handleRouteError } from "../../_lib/responses";
import { validateBarangayPsgcCode } from "../../_lib/validation";
import { getBarangayDetail } from "@/lib/territory-data";

type RouteParams = {
  psgcCode: string;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

const CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const MAX_BYTES = 500_000;

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { psgcCode: rawPsgcCode } = await context.params;
    const psgcCode = validateBarangayPsgcCode(rawPsgcCode);

    if (!psgcCode) {
      return errorJson("Invalid or missing `psgcCode`. Expected a 10-digit barangay PSGC code.", 400);
    }

    const detail = await getBarangayDetail(psgcCode);
    if (!detail) {
      return errorJson("Barangay not found.", 404);
    }

    const safePayload = enforcePayloadSizeLimit(detail, MAX_BYTES);
    if (!safePayload) {
      return errorJson("Geometry for this barangay is too large to return safely.", 400);
    }

    return NextResponse.json(
      { data: safePayload },
      {
        headers: {
          "Cache-Control": CACHE_CONTROL,
        },
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
