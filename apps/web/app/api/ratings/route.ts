// ============================================================================
// ⭐ AVERAGE RATING API - Get average ratings for entities
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

// ============================================================================
// 🌟 GET AVERAGE RATING
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType'); // 'doctor' or 'hospital'
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    if (!['doctor', 'hospital'].includes(entityType)) {
      return NextResponse.json(
        { error: 'entityType must be "doctor" or "hospital"' },
        { status: 400 }
      );
    }

    // Get average rating and total count
    const sql = `
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5
      FROM comments 
      WHERE entity_type = $1 
        AND entity_id = $2 
        AND is_active = true
        AND rating IS NOT NULL
    `;

    const result = await executeQuery(sql, [entityType, entityId]);
    
    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      });
    }

    const row = result[0];
    const ratingData = {
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

    return NextResponse.json({
      success: true,
      data: ratingData
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: true,
      data: { averageRating: 0, totalReviews: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
    });
  }
}

// ============================================================================
// 🌟 OPTIONS FOR CORS
// ============================================================================

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
