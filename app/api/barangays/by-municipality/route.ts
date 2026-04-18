import { NextResponse } from 'next/server';
import { makePlaceholderPayload } from '@/lib/api-placeholder';

export async function GET() {
  return NextResponse.json(
    makePlaceholderPayload('/api/barangays/by-municipality', 'Barangays by municipality endpoint placeholder.'),
    {
      status: 501,
    },
  );
}
