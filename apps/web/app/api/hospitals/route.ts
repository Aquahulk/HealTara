// ============================================================================
// 🏥 HOSPITALS API - Real hospital data with counts and ratings
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 Hospitals API: Fetching hospitals with counts and ratings');
    
    try {
      // First test basic database connection
      console.log('🔍 Testing database connection...');
      const testResult = await executeQuery('SELECT 1 as test');
      console.log('✅ Database connection test passed:', testResult);
      
      // Use raw query for efficiency with complex counts and ratings
      const sql = `
        SELECT 
          h.id,
          h.name,
          h.address,
          h.city,
          h.state,
          h.phone,
          h.subdomain,
          h.profile,
          (SELECT COUNT(*)::int FROM "Department" WHERE "hospitalId" = h.id) as dept_count,
          (SELECT COUNT(*)::int FROM "HospitalDoctor" WHERE "hospitalId" = h.id) as doc_count,
          (SELECT COUNT(*)::int FROM "Appointment" WHERE "doctorId" IN (SELECT "doctorId" FROM "HospitalDoctor" WHERE "hospitalId" = h.id)) as appt_count,
          (SELECT COUNT(*)::int FROM comments WHERE entity_type = 'hospital' AND entity_id = CAST(h.id AS TEXT) AND is_active = true) as review_count,
          (SELECT COALESCE(AVG(rating), 0)::float FROM comments WHERE entity_type = 'hospital' AND entity_id = CAST(h.id AS TEXT) AND is_active = true AND rating IS NOT NULL) as avg_rating
        FROM "Hospital" h
        ORDER BY avg_rating DESC NULLS LAST, h.name ASC
      `;

      const rows = await executeQuery(sql);
      
      if (rows.length === 0) {
        console.log('⚠️ No hospitals found in database');
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          isRealData: true,
          message: 'No hospitals found in database'
        });
      }

      const hospitals = rows.map(row => ({
        id: row.id,
        name: row.name,
        city: row.city,
        state: row.state,
        address: row.address,
        subdomain: row.subdomain,
        _count: {
          departments: row.dept_count || 0,
          doctors: row.doc_count || 0,
          appointments: row.appt_count || 0,
          reviews: row.review_count || 0
        },
        rating: row.avg_rating || 0,
        totalReviews: row.review_count || 0,
        profile: row.profile || {
          general: {
            logoUrl: null,
            description: "Healthcare facility"
          }
        }
      }));

      console.log(`✅ Found ${hospitals.length} hospitals with counts and ratings`);
      return NextResponse.json({
        success: true,
        data: hospitals,
        count: hospitals.length,
        isRealData: true,
        message: 'Real hospital data from database'
      });

    } catch (dbError: any) {
      console.error('❌ Database error in hospitals API:', dbError.message);
      return NextResponse.json({
        success: false,
        error: 'Database error: ' + dbError.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Hospitals API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'General error: ' + error.message
    }, { status: 500 });
  }
}

// ============================================================================
// 📤 POST HOSPITAL - Create new hospital
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, city, state, address } = body;

    if (!name || !city) {
      return NextResponse.json(
        { success: false, error: 'Hospital name and city are required' },
        { status: 400 }
      );
    }

    const insertSql = `
      INSERT INTO "Hospital" (name, city, state, address, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, name, city, state, address
    `;

    const result = await executeQuery(insertSql, [
      name,
      city,
      state || '',
      address || ''
    ]);

    if (result.length > 0) {
      console.log('✅ Created hospital in database:', result[0].name);
      return NextResponse.json({
        success: true,
        data: {
          ...result[0],
          _count: { departments: 0, doctors: 0, appointments: 0, reviews: 0 }
        },
        message: 'Hospital created successfully',
        isRealData: true
      });
    }

    throw new Error('Failed to insert hospital');

  } catch (error: any) {
    console.error('❌ Create Hospital Error:', error);
    return NextResponse.json(
      { success: false, error: 'Database connection failed: ' + error.message },
      { status: 500 }
    );
  }
}
