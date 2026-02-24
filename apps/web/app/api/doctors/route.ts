// ============================================================================
// 🧥 DOCTORS API - Real Database with Ratings and Counts
// ============================================================================
// Returns doctors with proper ratings average, department count, and doctor count
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'trending';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '12');

    console.log(`🧥 Doctors API: Fetching with ratings and counts - sort: ${sort}, page: ${page}, pageSize: ${pageSize}`);

    let doctors = [];
    let totalDoctors = 0;
    let dbConnected = false;

    try {
      // Try to connect to database
      const dbModule = eval('require')('../../../../api/src/db');
      const { prisma } = dbModule;
      
      if (prisma) {
        dbConnected = true;
        console.log('✅ Connected to database, fetching doctors with ratings...');
        
        // Fetch doctors with ratings and counts
        doctors = await prisma.doctor.findMany({
          include: {
            profile: true,
            _count: {
              select: {
                appointments: true,
                reviews: true,
                departments: true,
              },
            },
          },
          orderBy: sort === 'trending' 
            ? { appointments: { _count: 'desc' } }
            : sort === 'experience'
            ? { experience: 'desc' }
            : { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        });

        // Get total count
        totalDoctors = await prisma.doctor.count();
        
        // Calculate average ratings for each doctor
        doctors = await Promise.all(doctors.map(async (doctor: any) => {
          const ratings = await prisma.rating.findMany({
            where: { entityType: 'doctor', entityId: doctor.id },
            select: { rating: true }
          });
          
          const avgRating = ratings.length > 0 
            ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length 
            : 0;
          
          return {
            ...doctor,
            rating: parseFloat(avgRating.toFixed(1)),
            totalReviews: ratings.length,
          };
        }));
        
        console.log(`✅ Found ${doctors.length} doctors with ratings and counts`);
      }
    } catch (dbError: any) {
      console.error('❌ Database connection error:', dbError.message);
      dbConnected = false;
    }

    if (!dbConnected) {
      // Return sample data with proper structure when DB not available
      const sampleDoctors = [
        {
          id: 1,
          name: "Dr. Sarah Johnson",
          specialization: "Cardiology",
          experience: 15,
          consultationFee: 150,
          city: "New York",
          state: "NY",
          phone: "+1-555-0101",
          profile: {
            tagline: "Expert Heart Care",
            description: "Specialized in cardiovascular diseases"
          },
          rating: 4.8,
          totalReviews: 127,
          _count: {
            appointments: 342,
            reviews: 127,
            departments: 2
          }
        },
        {
          id: 2,
          name: "Dr. Michael Chen",
          specialization: "Neurology",
          experience: 12,
          consultationFee: 200,
          city: "Los Angeles",
          state: "CA",
          phone: "+1-555-0102",
          profile: {
            tagline: "Brain & Nerve Specialist",
            description: "Expert in neurological disorders"
          },
          rating: 4.9,
          totalReviews: 89,
          _count: {
            appointments: 256,
            reviews: 89,
            departments: 1
          }
        },
        {
          id: 3,
          name: "Dr. Emily Rodriguez",
          specialization: "Pediatrics",
          experience: 8,
          consultationFee: 120,
          city: "Chicago",
          state: "IL",
          phone: "+1-555-0103",
          profile: {
            tagline: "Child Healthcare Expert",
            description: "Dedicated to children's health"
          },
          rating: 4.7,
          totalReviews: 203,
          _count: {
            appointments: 412,
            reviews: 203,
            departments: 3
          }
        }
      ];

      // Sort sample data
      let sortedDoctors = [...sampleDoctors];
      if (sort === 'trending') {
        sortedDoctors.sort((a, b) => (b._count?.appointments || 0) - (a._count?.appointments || 0));
      } else if (sort === 'experience') {
        sortedDoctors.sort((a, b) => (b.experience || 0) - (a.experience || 0));
      }

      // Paginate sample data
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedDoctors = sortedDoctors.slice(startIndex, endIndex);

      return NextResponse.json({
        success: true,
        data: paginatedDoctors,
        pagination: {
          page,
          pageSize,
          total: sampleDoctors.length,
          totalPages: Math.ceil(sampleDoctors.length / pageSize)
        },
        isRealData: false,
        dataSource: 'sample-data-with-ratings',
        message: 'Sample doctors with ratings and counts'
      });
    }

    // Sort real doctors data
    let sortedDoctors = [...doctors];
    if (sort === 'trending') {
      sortedDoctors.sort((a, b) => (b._count?.appointments || 0) - (a._count?.appointments || 0));
    } else if (sort === 'rating') {
      sortedDoctors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'experience') {
      sortedDoctors.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    }

    // Paginate real data
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedDoctors = sortedDoctors.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedDoctors,
      pagination: {
        page,
        pageSize,
        total: totalDoctors,
        totalPages: Math.ceil(totalDoctors / pageSize)
      },
      isRealData: true,
      dataSource: 'postgresql-database-with-ratings',
      message: 'Real doctors with ratings and counts'
    });

  } catch (error: any) {
    console.error('❌ Doctors API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch doctors',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: []
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Doctor name is required' },
        { status: 400 }
      );
    }

    try {
      const dbModule = eval('require')('../../../../api/src/db');
      const { prisma } = dbModule;
      
      if (prisma) {
        const newDoctor = await prisma.doctor.create({
          data: {
            name: body.name,
            specialization: body.specialization,
            experience: body.experience,
            consultationFee: body.consultationFee,
            city: body.city,
            state: body.state,
            phone: body.phone,
            profile: body.profile || {},
          },
          include: {
            profile: true,
            _count: {
              select: {
                appointments: true,
                reviews: true,
                departments: true,
              },
            },
          },
        });

        console.log('✅ Created doctor in database:', newDoctor.name);

        return NextResponse.json({
          success: true,
          data: newDoctor,
          message: 'Doctor created successfully',
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
    console.error('❌ Create Doctor Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create doctor' },
      { status: 500 }
    );
  }
}
