import { NextResponse } from "next/server";

import { enforcePayloadSizeLimit } from "../../_lib/geometry";
import { errorJson, handleRouteError } from "../../_lib/responses";
import { getMunicipalityGeometry } from "@/lib/territory-data";

const CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const MAX_BYTES = 1_000_000;

export async function GET() {
  try {
    const geojson = await getMunicipalityGeometry();
    const safePayload = enforcePayloadSizeLimit(geojson, MAX_BYTES);

    if (!safePayload) {
      return errorJson("Municipality geometry payload is too large to return safely.", 400);
    }

    return NextResponse.json(safePayload, {
      headers: {
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
