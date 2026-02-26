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
        (SELECT COUNT(*) FROM comments WHERE parent_id = c.id AND is_active = true) as reply_count
      FROM comments c
      WHERE c.entity_type = $1 
        AND c.entity_id = $2
        AND c.is_active = true
      ORDER BY c.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const offset = (page - 1) * limit;

    try {
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
    } catch (dbErr: any) {
      const msg = String(dbErr?.message || '');
      const code = String((dbErr as any)?.code || '');
      const noDb = code === 'NO_DB_CONFIG' || msg.includes('NO_DB_CONFIG');
      
      if (noDb) {
        try {
          const apiHost = process.env.NEXT_PUBLIC_API_URL;
          if (!apiHost) throw new Error('NO_API_HOST');
          
          console.warn('⚠️ No DB config, falling back to API proxy for fetching comments');
          
          const qs = `?entityType=${entityType}&entityId=${entityId}&page=${page}&limit=${limit}`;
          const resp = await fetch(`${apiHost}/api/comments${qs}`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
          });

          if (!resp.ok) {
            const t = await resp.text().catch(() => '');
            throw new Error(`Upstream error: ${t || resp.status}`);
          }

          const data = await resp.json().catch(() => ({} as any));
          return NextResponse.json(data);
        } catch (proxyErr: any) {
          console.error('❌ Comments GET Fallback Error:', proxyErr);
          return NextResponse.json(
            { success: false, error: 'Failed to fetch comments (no DB and upstream failed)' },
            { status: 500 }
          );
        }
      }
      throw dbErr;
    }

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

    try {
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
          name: name,
          email: email,
          rating: rating,
          comment: comment,
          created_at: result[0].created_at,
          is_verified: true,
          reply_count: 0
        }
      });
    } catch (dbErr: any) {
      const msg = String(dbErr?.message || '');
      const code = String((dbErr as any)?.code || '');
      const noDb = code === 'NO_DB_CONFIG' || msg.includes('NO_DB_CONFIG');
      
      if (noDb) {
        try {
          const apiHost = process.env.NEXT_PUBLIC_API_URL;
          if (!apiHost) throw new Error('NO_API_HOST');
          
          console.warn('⚠️ No DB config, falling back to API proxy for comment');
          
          const resp = await fetch(`${apiHost}/api/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!resp.ok) {
            const t = await resp.text().catch(() => '');
            throw new Error(`Upstream error: ${t || resp.status}`);
          }

          const data = await resp.json().catch(() => ({} as any));
          return NextResponse.json({
            success: true,
            data: data?.data || null,
            message: data?.message || 'Comment stored via API fallback',
          });
        } catch (proxyErr: any) {
          console.error('❌ Comments POST Fallback Error:', proxyErr);
          return NextResponse.json(
            { success: false, error: 'Failed to store comment (no DB and upstream failed)' },
            { status: 500 }
          );
        }
      }
      throw dbErr;
    }

  } catch (error: any) {
    console.error('❌ Comments POST Error:', error);
    // Log the full error for debugging
    if (error.code) console.error('Error Code:', error.code);
    if (error.message) console.error('Error Message:', error.message);
    if (error.stack) console.error('Error Stack:', error.stack);
    
    return NextResponse.json(
      { success: false, error: 'Failed to store comment', detail: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// 📝 PATCH COMMENTS - Add replies
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      commentId, // Parent comment ID
      name,
      email,
      comment,
      userId
    } = body;

    if (!commentId || !name || !email || !comment) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get parent comment details to inherit entity_type and entity_id
    const parentSql = `SELECT entity_type, entity_id FROM comments WHERE id = $1`;
    const parentResult = await executeQuery(parentSql, [commentId]);

    if (parentResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Parent comment not found' },
        { status: 404 }
      );
    }

    const { entity_type, entity_id } = parentResult[0];

    // Insert reply into database
    const insertSql = `
      INSERT INTO comments (
        entity_type, entity_id, user_id, name, email, 
        comment, parent_id, is_verified, is_active, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, true, true, NOW()
      ) RETURNING id, created_at
    `;

    try {
      const result = await executeQuery(insertSql, [
        entity_type,
        entity_id,
        userId || null,
        name,
        email,
        comment,
        commentId
      ]);

      console.log(`✅ Reply stored permanently for comment ${commentId} by ${name}`);

      return NextResponse.json({
        success: true,
        data: {
          id: result[0].id,
          name: name,
          email: email,
          comment: comment,
          created_at: result[0].created_at,
          parent_id: commentId,
          is_verified: true
        }
      });
    } catch (dbErr: any) {
      const msg = String(dbErr?.message || '');
      const code = String((dbErr as any)?.code || '');
      const noDb = code === 'NO_DB_CONFIG' || msg.includes('NO_DB_CONFIG');
      
      if (noDb) {
        try {
          const apiHost = process.env.NEXT_PUBLIC_API_URL;
          if (!apiHost) throw new Error('NO_API_HOST');
          
          console.warn('⚠️ No DB config, falling back to API proxy for reply');
          
          const resp = await fetch(`${apiHost}/api/comments`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!resp.ok) {
            const t = await resp.text().catch(() => '');
            throw new Error(`Upstream error: ${t || resp.status}`);
          }

          const data = await resp.json().catch(() => ({} as any));
          return NextResponse.json(data);
        } catch (proxyErr: any) {
          console.error('❌ Comments PATCH Fallback Error:', proxyErr);
          return NextResponse.json(
            { success: false, error: 'Failed to store reply (no DB and upstream failed)' },
            { status: 500 }
          );
        }
      }
      throw dbErr;
    }

  } catch (error: any) {
    console.error('❌ Comments PATCH Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to store reply', detail: error.message },
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

    try {
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
    } catch (dbErr: any) {
      const msg = String(dbErr?.message || '');
      const code = String((dbErr as any)?.code || '');
      const noDb = code === 'NO_DB_CONFIG' || msg.includes('NO_DB_CONFIG');
      
      if (noDb) {
        try {
          const apiHost = process.env.NEXT_PUBLIC_API_URL;
          if (!apiHost) throw new Error('NO_API_HOST');
          
          console.warn('⚠️ No DB config, falling back to API proxy for delete');
          
          const qs = `?id=${commentId}&userId=${userId}`;
          const resp = await fetch(`${apiHost}/api/comments${qs}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!resp.ok) {
            const t = await resp.text().catch(() => '');
            throw new Error(`Upstream error: ${t || resp.status}`);
          }

          const data = await resp.json().catch(() => ({} as any));
          return NextResponse.json(data);
        } catch (proxyErr: any) {
          console.error('❌ Comments DELETE Fallback Error:', proxyErr);
          return NextResponse.json(
            { success: false, error: 'Failed to delete comment (no DB and upstream failed)' },
            { status: 500 }
          );
        }
      }
      throw dbErr;
    }

  } catch (error: any) {
    console.error('❌ Comments DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
