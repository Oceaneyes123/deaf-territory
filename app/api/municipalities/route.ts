import { NextResponse } from "next/server";

import { handleRouteError } from "../_lib/responses";
import { listMunicipalities } from "@/lib/territory-data";

const CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function GET() {
  try {
    const data = await listMunicipalities();

    return NextResponse.json(
      { data },
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
