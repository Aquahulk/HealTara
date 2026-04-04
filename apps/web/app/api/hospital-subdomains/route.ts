import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 Hospital Subdomains API: Fetching all hospital subdomains');
    
    try {
      // Test database connection
      const testResult = await executeQuery('SELECT 1 as test');
      console.log('✅ Database connection test passed:', testResult);
      
      // Simple query to get hospital names and subdomains
      const sql = `
        SELECT 
          h.id,
          h.name,
          h.subdomain,
          h.city,
          h.state
        FROM "Hospital" h
        WHERE h.subdomain IS NOT NULL AND h.subdomain != ''
        ORDER BY h.name ASC
      `;

      const rows = await executeQuery(sql);
      
      if (rows.length === 0) {
        console.log('⚠️ No hospitals with subdomains found, returning sample data');
        return NextResponse.json({
          success: true,
          data: [
            { id: 1, name: "City General Hospital (Demo)", subdomain: "citygeneral-demo", city: "Mumbai", state: "Maharashtra" },
            { id: 2, name: "Apollo Medical Center (Demo)", subdomain: "apollo-demo", city: "Delhi", state: "Delhi" },
            { id: 3, name: "Lifeline Care Hospital (Demo)", subdomain: "lifeline-demo", city: "Bangalore", state: "Karnataka" }
          ],
          count: 3,
          isRealData: false,
          message: 'Sample data (no hospitals with subdomains in database)'
        });
      }

      const subdomains = rows.map(row => ({
        id: row.id,
        name: row.name,
        subdomain: row.subdomain,
        city: row.city,
        state: row.state
      }));

      console.log(`✅ Found ${subdomains.length} hospitals with subdomains`);
      return NextResponse.json({
        success: true,
        data: subdomains,
        count: subdomains.length,
        isRealData: true,
        message: 'Real hospital subdomains from database'
      });

    } catch (dbError: any) {
      console.error('❌ Database error in subdomains API:', dbError.message);
      console.error('❌ Full error details:', dbError);
      
      // Return sample data on database error
      return NextResponse.json({
        success: true,
        data: [
          { id: 1, name: "City General Hospital (Demo)", subdomain: "citygeneral-demo", city: "Mumbai", state: "Maharashtra" },
          { id: 2, name: "Apollo Medical Center (Demo)", subdomain: "apollo-demo", city: "Delhi", state: "Delhi" },
          { id: 3, name: "Lifeline Care Hospital (Demo)", subdomain: "lifeline-demo", city: "Bangalore", state: "Karnataka" }
        ],
        count: 3,
        isRealData: false,
        message: 'Sample data (database error: ' + dbError.message + ')'
      });
    }

  } catch (error: any) {
    console.error('❌ Hospital Subdomains API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to fetch hospital subdomains'
    });
  }
}

// POST endpoint to update hospital subdomain
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hospitalId, subdomain } = body;

    if (!hospitalId || !subdomain) {
      return NextResponse.json(
        { success: false, error: 'Hospital ID and subdomain are required' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subdomain format. Use lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      );
    }

    // Update hospital subdomain
    const updateSql = `
      UPDATE "Hospital" 
      SET subdomain = $1, "updatedAt" = NOW()
      WHERE id = $2
      RETURNING id, name, subdomain
    `;

    const result = await executeQuery(updateSql, [subdomain, hospitalId]);
    
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Hospital not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Updated subdomain for hospital ${hospitalId} to "${subdomain}"`);
    
    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Hospital subdomain updated successfully'
    });

  } catch (error: any) {
    console.error('❌ Update hospital subdomain error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
