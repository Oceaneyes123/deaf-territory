import { NextResponse } from "next/server";

import { ILOILO_BARANGAYS } from "../../_data/iloilo";
import { validateSearchQuery } from "../../_lib/validation";

const MAX_RESULTS = 10;

type RankedBarangay = {
  psgcCode: string;
  name: string;
  municipalityPsgcCode: string;
  municipalityName: string;
  rank: number;
};

function rankMatch(name: string, q: string): number {
  const normalizedName = name.toLowerCase();
  const normalizedQuery = q.toLowerCase();

  if (normalizedName === normalizedQuery) {
    return 0;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 1;
  }

  if (normalizedName.includes(normalizedQuery)) {
    return 2;
  }

  return Number.POSITIVE_INFINITY;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = validateSearchQuery(searchParams.get("q"));

  if (!q) {
    return NextResponse.json(
      { error: "Invalid query. `q` is required and must be at least 2 characters." },
      { status: 400 },
    );
  }

  const results: RankedBarangay[] = ILOILO_BARANGAYS.map((barangay) => ({
    psgcCode: barangay.psgcCode,
    name: barangay.name,
    municipalityPsgcCode: barangay.municipalityPsgcCode,
    municipalityName: barangay.municipalityName,
    rank: rankMatch(barangay.name, q),
  }))
    .filter((item) => Number.isFinite(item.rank))
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ data: results.map(({ rank: _rank, ...rest }) => rest) });
}
