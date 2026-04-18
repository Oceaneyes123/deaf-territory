import { NextResponse } from "next/server";

import { ILOILO_BARANGAYS, ILOILO_MUNICIPALITIES } from "../../_data/iloilo";
import { validateMunicipalityPsgcCode } from "../../_lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const psgcCode = validateMunicipalityPsgcCode(searchParams.get("psgcCode"));

  if (!psgcCode) {
    return NextResponse.json(
      { error: "Invalid or missing `psgcCode` query parameter. Expected a 9-digit municipality PSGC code." },
      { status: 400 },
    );
  }

  const municipality = ILOILO_MUNICIPALITIES.find((entry) => entry.psgcCode === psgcCode);
  if (!municipality) {
    return NextResponse.json({ error: "Municipality not found." }, { status: 404 });
  }

  const data = ILOILO_BARANGAYS.filter((barangay) => barangay.municipalityPsgcCode === psgcCode)
    .map(({ psgcCode: barangayPsgcCode, name }) => ({ psgcCode: barangayPsgcCode, name }));

  return NextResponse.json({
    municipality: { psgcCode: municipality.psgcCode, name: municipality.name, type: municipality.type },
    data,
  });
}
