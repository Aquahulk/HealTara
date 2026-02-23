// ============================================================================
// 💬 COMMENTS API - Real-time Comment System for Subdomain Sites
// ============================================================================
// Handle patient comments, ratings, and replies for doctors/hospitals
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-pool';

export const memoryStore = new Map<string, any[]>();
export const k = (t: string, id: string) => `${t}:${id}`;

// ============================================================================
// 📝 GET COMMENTS - Fetch comments for entity
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

    // Fetch comments with pagination
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

    const comments = await executeQuery(sql, [entityType, entityId, limit, (page - 1) * limit]);

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM comments 
      WHERE entity_type = $1 
        AND entity_id = $2 
        AND is_active = true
    `;

    const countResult = await executeQuery(countSql, [entityType, entityId]);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'no-store',
      }
    });

  } catch (error) {
    const store = memoryStore.get(k(String(new URL(request.url).searchParams.get('entityType')), String(new URL(request.url).searchParams.get('entityId')))) || [];
    return NextResponse.json({
      success: true,
      data: store.slice(0, 10),
      pagination: { page: 1, limit: 10, total: store.length, totalPages: Math.max(1, Math.ceil(store.length / 10)) }
    });
  }
}

// ============================================================================
// 📝 POST COMMENT - Add new comment
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let {
      entityType, // 'doctor' or 'hospital'
      entityId,
      userId,
      name,
      email,
      rating, // 1-5
      comment,
      parentId = null // For replies
    } = body;

    entityType = typeof entityType === 'string' ? entityType : '';
    entityId = String(entityId ?? '');
    userId = userId ?? `anon-${Date.now()}`;
    email = typeof email === 'string' && email.trim() ? email : 'anonymous@local';
    name = typeof name === 'string' && name.trim() ? name : (email.split('@')[0] || 'Anonymous');
    rating = Math.max(1, Math.min(5, Number(rating || 0)));
    comment = typeof comment === 'string' ? comment.trim() : '';

    // Validation
    if (!entityType || !entityId || !comment || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['doctor', 'hospital'].includes(entityType)) {
      return NextResponse.json(
        { error: 'entityType must be "doctor" or "hospital"' },
        { status: 400 }
      );
    }

    // rating already clamped

    // Insert comment
    const sql = `
      INSERT INTO comments (
        entity_type, entity_id, user_id, parent_id, name, email, rating, comment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at, is_verified
    `;

    let newComment: any;
    try {
      const result = await executeQuery(sql, [
        entityType, entityId, userId, parentId, name, email, rating, comment
      ]);
      newComment = result[0];
    } catch {
      const list = memoryStore.get(k(entityType, String(entityId))) || [];
      newComment = {
        id: `${Date.now()}`,
        created_at: new Date().toISOString(),
        is_verified: false,
        name,
        email,
        rating,
        comment,
        parent_id: parentId
      };
      list.unshift(newComment);
      memoryStore.set(k(entityType, String(entityId)), list);
    }

    return NextResponse.json({
      success: true,
      data: newComment,
      message: 'Comment posted successfully'
    }, {
      headers: {
        'Cache-Control': 'no-cache', // Don't cache new comments
      }
    });

  } catch (error) {
    console.error('Post comment error:', error);
    return NextResponse.json(
      { error: 'Failed to post comment' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 📝 REPLY TO COMMENT - Add nested comment
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      commentId, // Parent comment ID
      userId,
      name,
      email,
      rating, // Optional for replies
      comment
    } = body;

    if (!commentId || !userId || !name || !email || !comment) {
      return NextResponse.json(
        { error: 'commentId, userId, name, email, and comment are required' },
        { status: 400 }
      );
    }

    // Get parent comment to determine entity_type and entity_id
    const parentSql = `
      SELECT entity_type, entity_id
      FROM comments 
      WHERE id = $1 AND is_active = true
    `;

    const parentResult = await executeQuery(parentSql, [commentId]);
    if (parentResult.length === 0) {
      return NextResponse.json(
        { error: 'Parent comment not found' },
        { status: 404 }
      );
    }

    const { entity_type, entity_id } = parentResult[0];

    // Insert reply
    const replySql = `
      INSERT INTO comments (
        entity_type, entity_id, parent_id, user_id, name, email, rating, comment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `;

    const result = await executeQuery(replySql, [
      entity_type, entity_id, commentId, userId, name, email, rating || null, comment
    ]);

    const newReply = result[0];

    return NextResponse.json({
      success: true,
      data: newReply,
      message: 'Reply posted successfully'
    });

  } catch (error) {
    console.error('Reply to comment error:', error);
    return NextResponse.json(
      { error: 'Failed to post reply' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 📝 REACTION TO COMMENT - Helpful/Not Helpful
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      commentId,
      userId,
      reactionType // 'helpful', 'not_helpful', 'spam'
    } = body;

    if (!commentId || !userId || !reactionType) {
      return NextResponse.json(
        { error: 'commentId, userId, and reactionType are required' },
        { status: 400 }
      );
    }

    if (!['helpful', 'not_helpful', 'spam'].includes(reactionType)) {
      return NextResponse.json(
        { error: 'reactionType must be "helpful", "not_helpful", or "spam"' },
        { status: 400 }
      );
    }

    // Insert reaction (with unique constraint)
    const sql = `
      INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (comment_id, user_id, reaction_type) 
      DO UPDATE SET created_at = CURRENT_TIMESTAMP
      RETURNING id, created_at
    `;

    const result = await executeQuery(sql, [commentId, userId, reactionType]);
    const newReaction = result[0];

    return NextResponse.json({
      success: true,
      data: newReaction,
      message: 'Reaction added successfully'
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 📝 DELETE COMMENT - Soft delete by user
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const userId = searchParams.get('userId');

    if (!commentId || !userId) {
      return NextResponse.json(
        { error: 'commentId and userId are required' },
        { status: 400 }
      );
    }

    // Soft delete (mark as inactive)
    const sql = `
      UPDATE comments 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await executeQuery(sql, [commentId, userId]);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Comment not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 📊 GET RATINGS SUMMARY - Average rating and total comments
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
