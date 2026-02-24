import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id || !/^[0-9]+$/.test(String(id))) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const rows = await executeQuery<{ name: string | null; email: string | null }>(
      'SELECT name, email FROM "User" WHERE id = $1 LIMIT 1',
      [id]
    );
    const u = rows[0] || null;
    if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ name: u.name, email: u.email });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
