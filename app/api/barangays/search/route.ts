import { NextResponse } from 'next/server';
import { makePlaceholderPayload } from '@/lib/api-placeholder';

export async function GET() {
  return NextResponse.json(makePlaceholderPayload('/api/barangays/search', 'Barangay search endpoint placeholder.'), {
    status: 501,
  });
}
