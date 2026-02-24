// ============================================================================
// ⭐ RATINGS API - Permanent Storage (No More Deletions)
// ============================================================================
// Ensures ratings are calculated from permanent comment storage
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

export const dynamic = 'force-dynamic';

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

    // Get average rating and total count from permanent storage
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

    let ratingData: {
      averageRating: number;
      totalReviews: number;
      ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
    };

    try {
      const result = await executeQuery(sql, [entityType, entityId]);

      if (result.length === 0) {
        ratingData = {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      } else {
        const row = result[0];
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

      if (!ratingData.totalReviews || Number.isNaN(ratingData.totalReviews)) {
        throw new Error('INVALID_DB_RATING_DATA');
      }

      return NextResponse.json({
        success: true,
        data: {
          averageRating: ratingData.averageRating,
          totalReviews: ratingData.totalReviews,
          ratingDistribution: ratingData.ratingDistribution,
          entityType,
          entityId
        }
      });

    } catch (dbError: any) {
      console.error('❌ Database rating error:', dbError);
      
      // Return default rating when database fails
      return NextResponse.json({
        success: true,
        data: {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          entityType,
          entityId
        },
        message: 'Default rating (database unavailable)'
      });
    }

  } catch (error: any) {
    console.error('❌ Ratings API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 📤 POST RATINGS - Store rating permanently
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId, rating, userId, comment } = body;

    // Validation
    if (!entityType || !entityId || !rating) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['doctor', 'hospital'].includes(entityType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Insert rating as comment (permanent storage)
    const insertSql = `
      INSERT INTO comments (
        entity_type, entity_id, user_id, name, email, rating, 
        comment, is_verified, is_active, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, true, true, NOW()
      ) RETURNING id, created_at
    `;

    const result = await executeQuery(insertSql, [
      entityType,
      entityId,
      userId || null,
      body.name || 'Anonymous',
      body.email || 'anonymous@example.com',
      rating,
      comment || ''
    ]);

    console.log(`✅ Rating stored permanently: ${entityType}:${entityId} = ${rating}`);

    return NextResponse.json({
      success: true,
      data: {
        id: result[0].id,
        message: 'Rating stored permanently',
        rating,
        created_at: result[0].created_at
      }
    });

  } catch (error: any) {
    console.error('❌ Ratings POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to store rating' },
      { status: 500 }
    );
  }
}
