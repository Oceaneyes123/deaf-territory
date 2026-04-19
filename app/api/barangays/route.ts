import { NextResponse } from "next/server";

import { enforcePayloadSizeLimit } from "../_lib/geometry";
import { errorJson, handleRouteError } from "../_lib/responses";
import { validateMunicipalityPsgcCode } from "../_lib/validation";
import { listBarangaysByMunicipality, listMunicipalities } from "@/lib/territory-data";

const CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const MAX_BYTES = 2_000_000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipality = validateMunicipalityPsgcCode(searchParams.get("municipality"));

    if (!municipality) {
      return errorJson(
        "Invalid or missing `municipality` query parameter. Expected a 9-digit municipality PSGC code.",
        400,
      );
    }

    const municipalities = await listMunicipalities();
    if (!municipalities.some((entry) => entry.psgcCode === municipality)) {
      return errorJson("Municipality not found.", 404);
    }

    const data = await listBarangaysByMunicipality(municipality);
    const safePayload = enforcePayloadSizeLimit(data, MAX_BYTES);

    if (!safePayload) {
      return errorJson("Barangay geometry payload is too large to return safely.", 400);
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
