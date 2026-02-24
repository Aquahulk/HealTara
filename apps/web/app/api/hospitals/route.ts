// ============================================================================
// 🏥 HOSPITALS API - Real hospital data with counts and ratings
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 Hospitals API: Fetching hospitals with counts and ratings');
    
    // Use executeQuery directly with the already configured Pool in lib/database-pool.ts
    // This is more reliable than trying to require Prisma from the api package
    const sql = `
      SELECT 
        h.id,
        h.name,
        h.city,
        h.state,
        h.address,
        h.subdomain,
        h.profile,
        (SELECT COUNT(*) FROM "Department" WHERE "hospitalId" = h.id) as dept_count,
        (SELECT COUNT(*) FROM "HospitalDoctor" WHERE "hospitalId" = h.id) as doc_count,
        (SELECT COUNT(*) FROM "Appointment" WHERE "doctorId" IN (SELECT "doctorId" FROM "HospitalDoctor" WHERE "hospitalId" = h.id)) as appt_count,
        (SELECT COUNT(*) FROM comments WHERE entity_type = 'hospital' AND entity_id = CAST(h.id AS TEXT) AND is_active = true) as review_count,
        (SELECT AVG(rating) FROM comments WHERE entity_type = 'hospital' AND entity_id = CAST(h.id AS TEXT) AND is_active = true AND rating IS NOT NULL) as avg_rating
      FROM "Hospital" h
      ORDER BY avg_rating DESC NULLS LAST, h.name ASC
    `;

    const rows = await executeQuery(sql);
    
    if (rows.length === 0) {
      console.log('⚠️ No hospitals found in database, returning sample data');
      return NextResponse.json({
        success: true,
        data: getSampleHospitals(),
        count: 3,
        isRealData: false,
        message: 'Sample data (no hospitals in database)'
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
        departments: parseInt(row.dept_count) || 0,
        doctors: parseInt(row.doc_count) || 0,
        appointments: parseInt(row.appt_count) || 0,
        reviews: parseInt(row.review_count) || 0
      },
      rating: parseFloat(row.avg_rating) || 0,
      totalReviews: parseInt(row.review_count) || 0,
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

  } catch (error: any) {
    console.error('❌ Hospitals API Error:', error);
    return NextResponse.json({
      success: true,
      data: getSampleHospitals(),
      count: 3,
      isRealData: false,
      message: 'Sample data (database error: ' + error.message + ')'
    });
  }
}

function getSampleHospitals() {
  return [
    {
      id: 1,
      name: "City General Hospital (Demo)",
      city: "Mumbai",
      state: "Maharashtra",
      address: "123 Main Street",
      _count: { departments: 15, doctors: 45, appointments: 1200, reviews: 350 },
      rating: 4.5,
      totalReviews: 350,
      profile: { general: { logoUrl: null, description: "Demo data" } }
    },
    {
      id: 2,
      name: "Apollo Medical Center (Demo)",
      city: "Delhi",
      state: "Delhi",
      address: "456 Park Avenue",
      _count: { departments: 20, doctors: 65, appointments: 1800, reviews: 520 },
      rating: 4.7,
      totalReviews: 520,
      profile: { general: { logoUrl: null, description: "Demo data" } }
    },
    {
      id: 3,
      name: "Lifeline Care Hospital (Demo)",
      city: "Bangalore",
      state: "Karnataka",
      address: "789 Tech Park Road",
      _count: { departments: 12, doctors: 38, appointments: 900, reviews: 280 },
      rating: 4.3,
      totalReviews: 280,
      profile: { general: { logoUrl: null, description: "Demo data" } }
    }
  ];
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
      INSERT INTO "Hospital" (name, city, state, address, "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
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
