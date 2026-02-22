// ============================================================================
// ⭐ SIMPLE RATING DISPLAY - Show average ratings in cards
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

// ============================================================================
// 🌟 RATING BAR CHART COMPONENT
// ============================================================================

interface RatingBarProps {
  rating: number;
  count: number;
  total: number;
}

export const RatingBar: React.FC<RatingBarProps> = ({ rating, count, total }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const maxCount = Math.max(count, 1);
  const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-600 w-8">{rating}★</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">
        {count} ({percentage.toFixed(1)}%)
      </span>
    </div>
  );
};

// ============================================================================
// 🌟 ENHANCED RATING DISPLAY COMPONENT
// ============================================================================

interface EnhancedRatingDisplayProps {
  entityType: 'doctor' | 'hospital';
  entityId: string;
  size?: 'sm' | 'md' | 'lg';
  showDistribution?: boolean;
}

export const EnhancedRatingDisplay: React.FC<EnhancedRatingDisplayProps> = ({ 
  entityType, 
  entityId, 
  size = 'md',
  showDistribution = false 
}) => {
  const [ratingData, setRatingData] = useState<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: any;
  }>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRating = async () => {
      try {
        const response = await fetch(
          `/api/ratings?entityType=${entityType}&entityId=${entityId}`
        );
        const result = await response.json();
        
        if (result.success) {
          setRatingData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch rating:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRating();
  }, [entityType, entityId]);

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`${sizeClasses[size]} bg-gray-200 rounded-full animate-pulse`}></div>
          ))}
        </div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (ratingData.totalReviews === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`${sizeClasses[size]} text-gray-300`} />
          ))}
        </div>
        <span className="text-sm text-gray-500">No ratings yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Rating Display */}
      <div className="flex items-center gap-2">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`${sizeClasses[size]} ${
                i < Math.floor(ratingData.averageRating) 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900">
            {ratingData.averageRating.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500">
            ({ratingData.totalReviews} reviews)
          </span>
        </div>
      </div>

      {/* Rating Distribution */}
      {showDistribution && ratingData.totalReviews > 0 && (
        <div className="space-y-1">
          {Object.entries(ratingData.ratingDistribution).map(([rating, count]: [string, number]) => (
            <RatingBar
              key={rating}
              rating={Number(rating)}
              count={Number(count)}
              total={ratingData.totalReviews}
            />
          ))}
        </div>
      )}
    </div>
  );
};
