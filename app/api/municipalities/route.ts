import { NextResponse } from "next/server";

import { ILOILO_MUNICIPALITIES } from "../_data/iloilo";

export async function GET() {
  return NextResponse.json({
    data: ILOILO_MUNICIPALITIES.map(({ psgcCode, name, type }) => ({ psgcCode, name, type })),
  });
}
