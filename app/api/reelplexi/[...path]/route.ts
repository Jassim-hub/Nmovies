import { NextRequest, NextResponse } from 'next/server';

const REELPLEXI_API_KEY = (process.env.REELPLEXI_API_KEY || process.env.NEXT_PUBLIC_REELPLEXI_API_KEY || '').replace(/[^\x20-\x7E]/g, '').trim();
const REELPLEXI_BASE_URL = 'https://api.reelplexi.com';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const searchParams = req.nextUrl.searchParams.toString();
  const url = `${REELPLEXI_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-API-Key': REELPLEXI_API_KEY,
        'Authorization': `Bearer ${REELPLEXI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Check if the response is JSON or something else
    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      const data = await res.text();
      return new NextResponse(data, {
        status: res.status,
        headers: {
          'Content-Type': contentType
        }
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
