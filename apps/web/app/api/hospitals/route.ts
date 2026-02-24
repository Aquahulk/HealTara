// ============================================================================
// 🏥 HOSPITALS API - Real hospital data with counts and ratings
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 Hospitals API: Fetching hospitals with counts and ratings');
    
    let hospitals = [];
    let dbConnected = false;

    try {
      // Try to connect to database
      const dbModule = eval('require')('../../../../api/src/db');
      const { prisma } = dbModule;
      
      if (prisma) {
        dbConnected = true;
        console.log('✅ Connected to database, fetching hospitals with counts...');
        
        // Fetch hospitals with department and doctor counts
        hospitals = await prisma.hospital.findMany({
          include: {
            _count: {
              select: {
                departments: true,
                doctors: true,
                appointments: true,
                reviews: true
              }
            },
            profile: {
              include: {
                general: true
              }
            }
          },
          orderBy: [
            { rating: 'desc' },
            { name: 'asc' }
          ]
        });
        
        // Add rating statistics to each hospital
        const hospitalsWithRatings = await Promise.all(
          hospitals.map(async (hospital: any) => {
            try {
              // Get rating statistics
              const ratingSql = `
                SELECT 
                  AVG(rating) as average_rating,
                  COUNT(*) as total_reviews,
                  COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
                  COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
                  COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
                  COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
                  COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5
                FROM comments 
                WHERE entity_type = 'hospital' 
                  AND entity_id = $1 
                  AND is_active = true
                  AND rating IS NOT NULL
              `;

              const ratingResult = await executeQuery(ratingSql, [hospital.id]);
              
              let ratingData = {
                averageRating: 0,
                totalReviews: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
              };

              if (ratingResult.length > 0) {
                const row = ratingResult[0];
                ratingData = {
                  averageRating: parseFloat(row.average_rating) || 0,
                  totalReviews: parseInt(row.total_reviews) || 0,
                  ratingDistribution: {
                    1: parseInt(row.rating_1) || 0,
                    2: parseInt(row.rating_2) || 0,
                    3: parseInt(row.rating_3) || 0,
                    4: parseInt(row.rating_4) || 0,
                    5: parseInt(row.rating_5) || 0
                  }
                };
              }

              return {
                ...hospital,
                rating: ratingData.averageRating,
                totalReviews: ratingData.totalReviews,
                ratingDistribution: ratingData.ratingDistribution
              };

            } catch (ratingError) {
              console.error(`❌ Error fetching ratings for hospital ${hospital.id}:`, ratingError);
              return {
                ...hospital,
                rating: 0,
                totalReviews: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
              };
            }
          })
        );
        
        hospitals = hospitalsWithRatings;
        console.log(`✅ Found ${hospitals.length} hospitals with counts and ratings`);
      }
    } catch (dbError: any) {
      console.error('❌ Database connection error:', dbError.message);
      dbConnected = false;
    }

    if (!dbConnected) {
      // Return sample data with proper structure when DB not available
      hospitals = [
        {
          id: 1,
          name: "City General Hospital",
          city: "Mumbai",
          state: "Maharashtra",
          address: "123 Main Street",
          _count: {
            departments: 15,
            doctors: 45,
            appointments: 1200,
            reviews: 350
          },
          rating: 4.5,
          totalReviews: 350,
          ratingDistribution: { 1: 10, 2: 20, 3: 50, 4: 120, 5: 150 },
          profile: {
            general: {
              logoUrl: null,
              description: "Multi-specialty hospital providing comprehensive healthcare"
            }
          }
        },
        {
          id: 2,
          name: "Apollo Medical Center",
          city: "Delhi",
          state: "Delhi",
          address: "456 Park Avenue",
          _count: {
            departments: 20,
            doctors: 65,
            appointments: 1800,
            reviews: 520
          },
          rating: 4.7,
          totalReviews: 520,
          ratingDistribution: { 1: 5, 2: 15, 3: 80, 4: 180, 5: 240 },
          profile: {
            general: {
              logoUrl: null,
              description: "Premier healthcare facility with advanced medical technology"
            }
          }
        },
        {
          id: 3,
          name: "Lifeline Care Hospital",
          city: "Bangalore",
          state: "Karnataka",
          address: "789 Tech Park Road",
          _count: {
            departments: 12,
            doctors: 38,
            appointments: 900,
            reviews: 280
          },
          rating: 4.3,
          totalReviews: 280,
          ratingDistribution: { 1: 15, 2: 25, 3: 60, 4: 100, 5: 80 },
          profile: {
            general: {
              logoUrl: null,
              description: "Patient-centric healthcare with modern facilities"
            }
          }
        }
      ];
      
      console.log('⚠️ Using sample hospital data with proper counts and ratings');
    }

    return NextResponse.json({
      success: true,
      data: hospitals,
      count: hospitals.length,
      isRealData: dbConnected,
      message: dbConnected ? 'Real hospital data from database' : 'Sample data (database unavailable)'
    });

  } catch (error: any) {
    console.error('❌ Hospitals API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch hospitals',
        data: [],
        count: 0
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// 📤 POST HOSPITAL - Create new hospital
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, city, state, address, description } = body;

    if (!name || !city) {
      return NextResponse.json(
        { success: false, error: 'Hospital name and city are required' },
        { status: 400 }
      );
    }

    try {
      const dbModule = eval('require')('../../../../api/src/db');
      const { prisma } = dbModule;
      
      if (prisma) {
        const newHospital = await prisma.hospital.create({
          data: {
            name,
            city,
            state: state || '',
            address: address || '',
            rating: 0,
            isActive: true
          },
          include: {
            _count: {
              select: {
                departments: true,
                doctors: true,
                appointments: true,
                reviews: true
              }
            }
          }
        });

        console.log('✅ Created hospital in database:', newHospital.name);

        return NextResponse.json({
          success: true,
          data: newHospital,
          message: 'Hospital created successfully',
          isRealData: true
        });
      }
    } catch (dbError: any) {
      console.error('❌ Database connection error:', dbError.message);
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Create Hospital Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create hospital' },
      { status: 500 }
    );
  }
}
