import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Database Schema Inspector');
    
    // Check what tables exist
    const tablesQuery = `
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_name
    `;
    
    const tables = await executeQuery(tablesQuery);
    console.log('📋 Tables found:', tables);
    
    // Check columns in Hospital table
    if (tables.some((t: any) => t.table_name === 'hospital')) {
      const hospitalColumns = await executeQuery(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'hospital' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log('🏥 Hospital table columns:', hospitalColumns);
    }
    
    // Check columns in User table
    if (tables.some((t: any) => t.table_name === 'user' || t.table_name === 'User')) {
      const userColumns = await executeQuery(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'User' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log('👤 User table columns:', userColumns);
    }
    
    // Check columns in DoctorProfile table
    if (tables.some((t: any) => t.table_name === 'DoctorProfile')) {
      const doctorColumns = await executeQuery(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log('👨‍⚕️ DoctorProfile table columns:', doctorColumns);
    }
    
    return NextResponse.json({
      success: true,
      tables: tables,
      message: 'Database schema inspection complete'
    });
    
  } catch (error: any) {
    console.error('❌ Schema inspection error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Schema inspection failed'
    });
  }
}
