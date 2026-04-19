import { NextResponse } from "next/server";

import { handleRouteError } from "../_lib/responses";
import { getMunicipalityGeometry, listMunicipalities } from "@/lib/territory-data";

const CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function GET() {
  try {
    const [municipalities, municipalityGeometry] = await Promise.all([
      listMunicipalities(),
      getMunicipalityGeometry(),
    ]);

    return NextResponse.json(
      {
        data: {
          municipalities,
          municipalityGeometry,
        },
      },
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
