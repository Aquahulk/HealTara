import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await context.params;
  try {
    const apiHost = process.env.NEXT_PUBLIC_API_URL;
    if (!apiHost) {
      return NextResponse.json({ success: false, message: 'API host not configured' }, { status: 500 });
    }
    const body = await request.text();
    const auth = request.headers.get('authorization') || undefined;
    const resp = await fetch(`${apiHost}/api/admin/verifications/hospital/${encodeURIComponent(hospitalId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
      cache: 'no-store',
    });
    const txt = await resp.text();
    try {
      const json = JSON.parse(txt);
      return NextResponse.json(json, { status: resp.status });
    } catch {
      return NextResponse.json({ success: false, message: txt || 'Upstream error' }, { status: resp.status || 502 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Proxy error: ' + (error?.message || String(error)) }, { status: 502 });
  }
}
