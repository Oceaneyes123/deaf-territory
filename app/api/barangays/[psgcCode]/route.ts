import { NextResponse } from "next/server";

import { ILOILO_BARANGAYS } from "../../_data/iloilo";
import { enforceGeometrySizeLimit, simplifyGeometry } from "../../_lib/geometry";
import { validateBarangayPsgcCode } from "../../_lib/validation";

type RouteParams = {
  psgcCode: string;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { psgcCode: rawPsgcCode } = await Promise.resolve(context.params);
  const psgcCode = validateBarangayPsgcCode(rawPsgcCode);

  if (!psgcCode) {
    return NextResponse.json(
      { error: "Invalid or missing `psgcCode`. Expected a 10-digit barangay PSGC code." },
      { status: 400 },
    );
  }

  const barangay = ILOILO_BARANGAYS.find((entry) => entry.psgcCode === psgcCode);
  if (!barangay) {
    return NextResponse.json({ error: "Barangay not found." }, { status: 404 });
  }

  const simplified = simplifyGeometry(barangay.geometry);
  const geometry = enforceGeometrySizeLimit(simplified);

  if (!geometry) {
    return NextResponse.json(
      { error: "Geometry for this barangay is too large to return safely." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: {
      psgcCode: barangay.psgcCode,
      name: barangay.name,
      municipalityPsgcCode: barangay.municipalityPsgcCode,
      municipalityName: barangay.municipalityName,
      geometry,
    },
  });
}
