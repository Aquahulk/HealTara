// ============================================================================
// 🧥 DOCTORS API - Real Database with Ratings and Counts
// ============================================================================
// Returns doctors with proper ratings average, department count, and doctor count
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Proxy to backend API to ensure real data and avoid local DB dependency
    const apiHost = process.env.NEXT_PUBLIC_API_URL;
    const url = new URL(request.url);
    const qs = url.search ? url.search : '';
    if (!apiHost) {
      throw new Error('API host not configured');
    }
    const resp = await fetch(`${apiHost}/api/doctors${qs}`, { cache: 'no-store' });
    const body = await resp.text();
    try {
      const json = JSON.parse(body);
      return NextResponse.json(json, { status: resp.status });
    } catch {
      return NextResponse.json({ success: false, message: body || 'Upstream error' }, { status: resp.status || 502 });
    }

  } catch (error: any) {
    console.error('❌ Doctors API Proxy Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Upstream unavailable: ' + error.message
    });
  }
}

// No local fallback; rely on upstream API data
