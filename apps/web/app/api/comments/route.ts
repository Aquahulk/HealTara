// ============================================================================
// 💬 COMMENTS API - Permanent Storage (No More Deletions)
// ============================================================================
// Ensures comments and ratings are stored forever in database
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

// ============================================================================
// 📝 GET COMMENTS - Fetch permanent comments
// ============================================================================

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType'); // 'doctor' or 'hospital'
    const entityId = searchParams.get('entityId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    // Fetch comments from database (permanent storage)
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c.rating,
        c.comment,
        c.is_verified,
        c.created_at,
        c.parent_id,
        u.name as user_name,
        u.avatar_url as user_avatar,
        (SELECT COUNT(*) FROM comments WHERE parent_id = c.id AND is_active = true) as reply_count
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.entity_type = $1 
        AND c.entity_id = $2
        AND c.is_active = true
      ORDER BY c.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const offset = (page - 1) * limit;
    const comments = await executeQuery(sql, [entityType, entityId, limit, offset]);

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM comments 
      WHERE entity_type = $1 
        AND entity_id = $2
        AND is_active = true
    `;
    const countResult = await executeQuery(countSql, [entityType, entityId]);
    const total = parseInt(countResult[0]?.total || '0');

    return NextResponse.json({
      success: true,
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Comments GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 📤 POST COMMENTS - Store comments permanently
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entityType,
      entityId,
      name,
      email,
      rating,
      comment,
      parentId,
      userId
    } = body;

    // Validation
    if (!entityType || !entityId || !name || !email || !comment) {
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

    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Insert comment into database (permanent storage)
    const insertSql = `
      INSERT INTO comments (
        entity_type, entity_id, user_id, name, email, rating, 
        comment, parent_id, is_verified, is_active, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, true, true, NOW()
      ) RETURNING id, created_at
    `;

    const result = await executeQuery(insertSql, [
      entityType,
      entityId,
      userId || null,
      name,
      email,
      rating || null,
      comment,
      parentId || null
    ]);

    console.log(`✅ Comment stored permanently: ${entityType}:${entityId} by ${name}`);

    return NextResponse.json({
      success: true,
      data: {
        id: result[0].id,
        message: 'Comment stored permanently',
        created_at: result[0].created_at
      }
    });

  } catch (error: any) {
    console.error('❌ Comments POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to store comment' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 🗑️ DELETE COMMENTS - Soft delete (never actually delete)
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    // Soft delete (mark as inactive) - never actually delete
    const updateSql = `
      UPDATE comments 
      SET is_active = false, 
          deleted_at = NOW(),
          deleted_by = $1
      WHERE id = $2
      RETURNING id
    `;

    const result = await executeQuery(updateSql, [userId, commentId]);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Comment soft deleted: ${commentId}`);

    return NextResponse.json({
      success: true,
      message: 'Comment deactivated (preserved in database)'
    });

  } catch (error: any) {
    console.error('❌ Comments DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
