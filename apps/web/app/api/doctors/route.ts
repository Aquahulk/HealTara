// ============================================================================
// 🧥 DOCTORS API - Real Database with Ratings and Counts
// ============================================================================
// Returns doctors with proper ratings average, department count, and doctor count
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'trending';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');

    console.log(`🧥 Doctors API: Fetching with ratings and counts - sort: ${sort}, page: ${page}, pageSize: ${pageSize}`);

    try {
      // First test basic database connection
      console.log('🔍 Testing database connection...');
      const testResult = await executeQuery('SELECT 1 as test');
      console.log('✅ Database connection test passed:', testResult);
      
      const offset = (page - 1) * pageSize;
      
      // Use executeQuery directly with the already configured Pool in lib/database-pool.ts
      const sql = `
        SELECT 
          u.id,
          u.email,
          dp.id as profile_id,
          dp.specialization,
          dp.qualifications,
          dp.experience,
          dp."clinicName" as clinic_name,
          dp."clinicAddress" as clinic_address,
          dp.city,
          dp.state,
          dp.phone,
          dp."consultationFee" as consultation_fee,
          dp.slug,
          dp."profileImage" as profile_image,
          (SELECT COUNT(*)::int FROM "Appointment" WHERE "doctorId" = u.id) as appt_count,
          (SELECT COUNT(*)::int FROM comments WHERE entity_type = 'doctor' AND entity_id = CAST(u.id AS TEXT) AND is_active = true) as review_count,
          (SELECT COALESCE(AVG(rating), 0)::float FROM comments WHERE entity_type = 'doctor' AND entity_id = CAST(u.id AS TEXT) AND is_active = true AND rating IS NOT NULL) as avg_rating
        FROM "User" u
        JOIN "DoctorProfile" dp ON u.id = dp."userId"
        WHERE u.role = 'DOCTOR'
        ORDER BY 
          ${sort === 'trending' ? 'appt_count DESC,' : ''}
          ${sort === 'experience' ? 'dp.experience DESC,' : ''}
          u."createdAt" DESC
        LIMIT $1 OFFSET $2
      `;

      const rows = await executeQuery(sql, [pageSize, offset]);
      
      if (rows.length === 0) {
        console.log('⚠️ No doctors found in database');
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          isRealData: true,
          message: 'No doctors found in database'
        });
      }

      const doctors = rows.map(row => {
        // derive name from email prefix as fallback since User table has no name column
        const emailPrefix = row.email.split('@')[0];
        const derivedName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).replace(/[._-]/g, ' ');
        const name = derivedName;
        
        // Generate a fallback slug from name if not present
        const slug = row.slug || name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
        
        return {
          id: row.id,
          email: row.email,
          name: name,
          doctorProfile: {
            id: row.profile_id,
            specialization: row.specialization,
            qualifications: row.qualifications,
            experience: row.experience,
            clinicName: row.clinic_name,
            clinicAddress: row.clinic_address,
            city: row.city,
            state: row.state,
            phone: row.phone,
            consultationFee: row.consultation_fee,
            slug: slug,
            profileImage: row.profile_image
          },
          rating: row.avg_rating || 0,
          totalReviews: row.review_count || 0,
          _count: {
            appointments: row.appt_count || 0,
            reviews: row.review_count || 0
          }
        };
      });

      console.log(`✅ Found ${doctors.length} doctors with ratings and counts`);
      return NextResponse.json({
        success: true,
        data: doctors,
        count: doctors.length,
        isRealData: true,
        message: 'Real doctor data from database'
      });

    } catch (dbError: any) {
      console.error('❌ Database error in doctors API:', dbError.message);
      return NextResponse.json({
        success: false,
        error: 'Database error: ' + dbError.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Doctors API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'General error: ' + error.message
    }, { status: 500 });
  }
}
