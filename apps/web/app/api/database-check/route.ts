import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Database Structure Check');
    
    // Test basic connection
    const testResult = await executeQuery('SELECT 1 as test');
    console.log('✅ Database connection:', testResult);
    
    // Check if Hospital table exists and its structure
    const tableCheck = await executeQuery(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_name = 'Hospital' OR table_name = 'hospital'
      ORDER BY table_name
    `);
    console.log('📋 Hospital tables found:', tableCheck);
    
    // Check Hospital table columns
    if (tableCheck.length > 0) {
      const tableName = tableCheck[0].table_name;
      const columns = await executeQuery(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log(`🏥 ${tableName} table columns:`, columns);
      
      // Try to fetch some hospital data
      try {
        const hospitals = await executeQuery(`
          SELECT id, name, city, state, subdomain 
          FROM "${tableName}" 
          LIMIT 5
        `);
        console.log(`📊 Sample hospital data:`, hospitals);
        
        return NextResponse.json({
          success: true,
          tableName: tableName,
          columns: columns,
          sampleData: hospitals,
          message: 'Database structure analysis complete'
        });
        
      } catch (dataError: any) {
        console.error('❌ Error fetching hospital data:', dataError.message);
        return NextResponse.json({
          success: true,
          tableName: tableName,
          columns: columns,
          error: dataError.message,
          message: 'Table exists but data fetch failed - need schema fix'
        });
      }
    } else {
      console.log('❌ No Hospital table found');
      return NextResponse.json({
        success: false,
        error: 'No Hospital table found in database',
        message: 'Need to create Hospital table first'
      });
    }
    
  } catch (error: any) {
    console.error('❌ Database structure check failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Database connection or query failed'
    });
  }
}
