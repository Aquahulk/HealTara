-- ============================================================================
// 💬 COMMENTS SYSTEM - Database Schema for Subdomain Sites
// ============================================================================
-- Add comments tables to enable patient feedback on doctor/hospital sites
// ============================================================================

-- Comments table for doctors and hospitals
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL, -- 'doctor' or 'hospital'
    entity_id UUID NOT NULL, -- doctor_id or hospital_id
    user_id UUID REFERENCES users(id),
    parent_id UUID REFERENCES comments(id), -- For replies
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
    comment TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false, -- Verified by admin
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comment replies tracking
CREATE TABLE IF NOT EXISTS comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id),
    user_id UUID REFERENCES users(id),
    reaction_type VARCHAR(20) NOT NULL, -- 'helpful', 'not_helpful', 'spam'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id, reaction_type)
);

-- Comment moderation logs
CREATE TABLE IF NOT EXISTS comment_moderation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id),
    moderated_by UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'approved', 'rejected', 'edited'
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes for comments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_entity 
ON comments(entity_type, entity_id, is_active, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user 
ON comments(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_parent 
ON comments(parent_id, created_at ASC);

-- Insert sample comments
INSERT INTO comments (entity_type, entity_id, user_id, name, email, rating, comment)
SELECT 
    'doctor',
    d.id,
    u.id,
    'John Doe',
    'john.doe@example.com',
    5,
    'Excellent doctor! Very professional and caring. Highly recommended.'
FROM doctors d, users u
WHERE NOT EXISTS (SELECT 1 FROM comments LIMIT 1)
LIMIT 1;

INSERT INTO comments (entity_type, entity_id, user_id, name, email, rating, comment)
SELECT 
    'hospital',
    h.id,
    u.id,
    'Jane Smith',
    'jane.smith@example.com',
    4,
    'Great hospital with modern facilities. Staff was very helpful.'
FROM hospitals h, users u
WHERE NOT EXISTS (SELECT 1 FROM comments LIMIT 1)
LIMIT 1;

-- View for comments with user info
CREATE OR REPLACE VIEW comments_with_users AS
SELECT 
    c.id,
    c.entity_type,
    c.entity_id,
    c.parent_id,
    c.name,
    c.email,
    c.rating,
    c.comment,
    c.is_verified,
    c.is_active,
    c.created_at,
    c.updated_at,
    u.name as user_name,
    u.avatar_url as user_avatar,
    -- Count of replies
    (SELECT COUNT(*) FROM comments WHERE parent_id = c.id AND is_active = true) as reply_count,
    -- Average rating for this entity
    (SELECT AVG(rating) FROM comments WHERE entity_id = c.entity_id AND entity_type = c.entity_type AND is_active = true) as entity_avg_rating
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
WHERE c.is_active = true;

-- Show recent comments
SELECT 
    entity_type,
    entity_id,
    COUNT(*) as comment_count,
    AVG(rating) as avg_rating
FROM comments 
WHERE is_active = true
GROUP BY entity_type, entity_id
ORDER BY comment_count DESC;
