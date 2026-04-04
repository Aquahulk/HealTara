// ============================================================================
// 🏥 HOSPITALS API - Real hospital data with counts and ratings
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiHost = process.env.NEXT_PUBLIC_API_URL;
    const url = new URL(request.url);
    const qs = url.search ? url.search : '';
    if (!apiHost) throw new Error('API host not configured');
    const resp = await fetch(`${apiHost}/api/hospitals${qs}`, { cache: 'no-store' });
    const body = await resp.text();
    try {
      const json = JSON.parse(body);
      return NextResponse.json(json, { status: resp.status });
    } catch {
      return NextResponse.json({ success: false, message: body || 'Upstream error' }, { status: resp.status || 502 });
    }

  } catch (error: any) {
    console.error('❌ Hospitals API Proxy Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Upstream unavailable: ' + error.message
    });
  }
}

// No local fallback; rely on upstream API data

// ============================================================================
// 📤 POST HOSPITAL - Create new hospital
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Proxy creation to backend API
    const apiHost = process.env.NEXT_PUBLIC_API_URL;
    if (!apiHost) throw new Error('API host not configured');
    const body = await request.text();
    const resp = await fetch(`${apiHost}/api/hospitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const text = await resp.text();
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: resp.status });
    } catch {
      return NextResponse.json({ success: false, message: text || 'Upstream error' }, { status: resp.status || 502 });
    }

  } catch (error: any) {
    console.error('❌ Create Hospital Proxy Error:', error);
    return NextResponse.json({ success: false, message: 'Upstream unavailable: ' + error.message }, { status: 502 });
  }
}
