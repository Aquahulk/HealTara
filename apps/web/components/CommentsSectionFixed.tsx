// ============================================================================
// 💬 COMMENT SYSTEM COMPONENTS - Real-time Comments for Subdomain Sites
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Reply } from 'lucide-react';

// ============================================================================
// 🌟 RATING DISPLAY COMPONENT
// ============================================================================

interface RatingDisplayProps {
  rating: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({ 
  rating, 
  showValue = true, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`${sizeClasses[size]} ${
              i < rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-gray-700 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 💬 COMMENT CARD COMPONENT
// ============================================================================

interface CommentCardProps {
  comment: any;
  onReply?: (commentId: string) => void;
  onReact?: (commentId: string, reaction: string) => void;
  onDelete?: (commentId: string) => void;
  isReply?: boolean;
}

export const CommentCard: React.FC<CommentCardProps> = ({ 
  comment, 
  onReply, 
  onReact, 
  onDelete,
  isReply = false 
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReaction = async (reactionType: string) => {
    try {
      await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id,
          reactionType,
          userId: 'current_user_id'
        }),
      });
      if (onReact) onReact(comment.id, reactionType);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id,
          name: 'Current User',
          email: 'user@example.com',
          comment: replyText,
          userId: 'current_user_id'
        }),
      });

      if (response.ok) {
        setReplyText('');
        setShowReplyForm(false);
        if (onReply) onReply(comment.id);
      }
    } catch (error) {
      console.error('Failed to post reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`bg-white rounded-lg border ${isReply ? 'border-gray-100' : 'border-gray-200'} p-4 ${isReply ? 'ml-8' : ''}`}>
      {/* Comment Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {comment.name.charAt(0).toUpperCase()}
          </div>
          
          {/* User Info */}
          <div>
            <div className="font-medium text-gray-900">{comment.name}</div>
            <div className="text-sm text-gray-500">{formatDate(comment.created_at)}</div>
          </div>
        </div>
      </div>

      {/* Rating */}
      {comment.rating && (
        <div className="mb-3">
          <RatingDisplay rating={comment.rating} size="sm" />
        </div>
      )}

      {/* Comment Content */}
      <div className="text-gray-700 mb-3 leading-relaxed">
        {comment.comment}
      </div>

      {/* Verified Badge */}
      {comment.is_verified && (
        <div className="inline-flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs font-medium mb-3">
          ✓ Verified Review
        </div>
      )}

      {/* Comment Actions */}
      <div className="flex items-center gap-4 text-sm">
        {/* Reply Button */}
        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
        >
          <Reply className="w-3 h-3" />
          Reply
        </button>

        {/* Helpful/Not Helpful */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReaction('helpful')}
            className="flex items-center gap-1 text-gray-500 hover:text-green-600"
          >
            <ThumbsUp className="w-3 h-3" />
            Helpful
          </button>
          
          <button
            onClick={() => handleReaction('not_helpful')}
            className="flex items-center gap-1 text-gray-500 hover:text-red-600"
          >
            <ThumbsDown className="w-3 h-3" />
            Not Helpful
          </button>
        </div>

        {/* Reply Count */}
        {comment.reply_count > 0 && (
          <div className="text-gray-500">
            {comment.reply_count} {comment.reply_count === 1 ? 'Reply' : 'Replies'}
          </div>
        )}
      </div>

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            className="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setShowReplyForm(false)}
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleReply}
              disabled={isSubmitting || !replyText.trim()}
              className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 💬 COMMENT FORM COMPONENT - Add New Comment
// ============================================================================

interface CommentFormProps {
  entityType: 'doctor' | 'hospital';
  entityId: string;
  onCommentPosted?: (comment: any) => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({ 
  entityType, 
  entityId, 
  onCommentPosted 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rating: 5,
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.comment.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          ...formData,
          userId: 'current_user_id'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setFormData({ name: '', email: '', rating: 5, comment: '' });
        if (onCommentPosted) onCommentPosted(result.data);
      } else {
        const result = await response.json();
        alert(`Failed to post comment: ${result.detail || 'Server error'}`);
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert(`Failed to post comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave a Review</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name and Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rating *
          </label>
          <div className="flex items-center gap-2">
            <RatingDisplay rating={formData.rating} showValue={false} />
            <input
              type="range"
              min="1"
              max="5"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
              className="flex-1"
            />
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Review *
          </label>
          <textarea
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Share your experience..."
            rows={4}
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitting ? 'Posting Review...' : 'Post Review'}
        </button>
      </form>
    </div>
  );
};

// ============================================================================
// 💬 COMMENTS SECTION COMPONENT - Main Comments Display
// ============================================================================

interface CommentsSectionProps {
  entityType: 'doctor' | 'hospital';
  entityId: string;
  entityName?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ 
  entityType, 
  entityId, 
  entityName 
}) => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadComments = async (pageNum = 1) => {
    try {
      const response = await fetch(
        `/api/comments?entityType=${entityType}&entityId=${entityId}&page=${pageNum}&limit=10`
      );
      const result = await response.json();
      
      if (result.success) {
        if (pageNum === 1) {
          setComments(result.data);
        } else {
          setComments([...comments, ...result.data]);
        }
        setTotalPages(result.pagination.totalPages);
        setPage(pageNum);
      } else {
        setError('Failed to load comments');
      }
    } catch (err) {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [entityType, entityId]);

  const handleCommentPosted = (newComment: any) => {
    setComments([newComment, ...comments]);
  };

  const loadMoreComments = () => {
    if (page < totalPages) {
      loadComments(page + 1);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse h-6 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-800">Failed to load comments</p>
        <button
          onClick={() => loadComments()}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          Patient Reviews
        </h3>
        {entityName && (
          <div className="text-sm text-gray-600">
            Reviews for {entityName}
          </div>
        )}
      </div>

      {/* Comment Form */}
      <CommentForm 
        entityType={entityType}
        entityId={entityId}
        onCommentPosted={handleCommentPosted}
      />

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onReply={(replyId) => {
                console.log('Reply to:', replyId);
              }}
              onReact={(commentId, reaction) => {
                console.log('React:', commentId, reaction);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No reviews yet</p>
          <p className="text-sm text-gray-500">
            Be the first to share your experience!
          </p>
        </div>
      )}

      {/* Load More Button */}
      {page < totalPages && (
        <div className="text-center">
          <button
            onClick={loadMoreComments}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
};
