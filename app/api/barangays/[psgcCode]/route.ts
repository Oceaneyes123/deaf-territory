import { NextRequest, NextResponse } from 'next/server';
import { makePlaceholderPayload } from '@/lib/api-placeholder';

type RouteContext = {
  params: Promise<{ psgcCode: string }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  const { psgcCode } = await context.params;

  return NextResponse.json(
    makePlaceholderPayload(`/api/barangays/${psgcCode}`, `Barangay detail endpoint placeholder for ${psgcCode}.`),
    {
      status: 501,
    },
  );
}
