import { NextResponse } from 'next/server';
import { makePlaceholderPayload } from '@/lib/api-placeholder';

export async function GET() {
  return NextResponse.json(makePlaceholderPayload('/api/municipalities', 'Municipality list endpoint placeholder.'), {
    status: 501,
  });
}
