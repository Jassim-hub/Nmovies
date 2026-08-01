import { NextRequest, NextResponse } from 'next/server';

const REELPLEXI_API_KEY = (process.env.REELPLEXI_API_KEY || process.env.NEXT_PUBLIC_REELPLEXI_API_KEY || '').replace(/[^\x20-\x7E]/g, '').trim();
const REELPLEXI_BASE_URL = 'https://api.reelplexi.com';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path ? resolvedParams.path.join('/') : '';
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${REELPLEXI_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (REELPLEXI_API_KEY) {
      headers['X-API-Key'] = REELPLEXI_API_KEY;
      headers['Authorization'] = `Bearer ${REELPLEXI_API_KEY}`;
    }

    const res = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Error proxying Reelplexi API in panel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Reelplexi API' },
      { status: 500 }
    );
  }
}
