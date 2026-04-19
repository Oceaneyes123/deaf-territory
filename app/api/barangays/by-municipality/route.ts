import { NextResponse } from "next/server";

import { enforcePayloadSizeLimit } from "../../_lib/geometry";
import { errorJson, handleRouteError } from "../../_lib/responses";
import { validateMunicipalityPsgcCode } from "../../_lib/validation";
import { hasMunicipality, listBarangaysByMunicipality } from "@/lib/territory-data";

const CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const MAX_BYTES = 2_000_000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const psgcCode = validateMunicipalityPsgcCode(searchParams.get("psgcCode"));

    if (!psgcCode) {
      return errorJson(
        "Invalid or missing `psgcCode` query parameter. Expected a 9-digit municipality PSGC code.",
        400,
      );
    }

    if (!(await hasMunicipality(psgcCode))) {
      return errorJson("Municipality not found.", 404);
    }

    const data = await listBarangaysByMunicipality(psgcCode);
    const safePayload = enforcePayloadSizeLimit(data, MAX_BYTES);

    if (!safePayload) {
      return errorJson("Barangay geometry payload is too large to return safely.", 400);
    }

    return NextResponse.json(safePayload, {
      headers: {
        "Cache-Control": CACHE_CONTROL,
        Deprecation: "true",
        Link: "</api/barangays?municipality={psgcCode}>; rel=\"successor-version\"",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
