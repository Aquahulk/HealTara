// ============================================================================
// ⭐ AVERAGE RATING DISPLAY - Show average ratings in cards
// ============================================================================
// Calculate and display average ratings from comment system
// ============================================================================

import { executeQuery } from '@/lib/database-pool';

// ============================================================================
// 🌟 GET AVERAGE RATING API
// ============================================================================

export async function getAverageRating(entityType: 'doctor' | 'hospital', entityId: string): Promise<{
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}> {
  try {
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
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const row = result[0];
    return {
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

  } catch (error) {
    console.error('Failed to get average rating:', error);
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
}

// ============================================================================
// 🌟 RATING BAR CHART COMPONENT
// ============================================================================

interface RatingBarProps {
  rating: number;
  count: number;
  total: number;
  maxCount?: number;
}

export const RatingBar: React.FC<RatingBarProps> = ({ 
  rating, 
  count, 
  total, 
  maxCount 
}) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const maxBarCount = maxCount || Math.max(...Object.values({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }.map(v => count)));
  const barWidth = maxBarCount > 0 ? (count / maxBarCount) * 100 : 0;
  
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
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  }>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRating = async () => {
      try {
        const data = await getAverageRating(entityType, entityId);
        setRatingData(data);
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
        <span className="text-sm text-gray-500">No reviews</span>
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
          {Object.entries(ratingData.ratingDistribution).map(([rating, count]) => (
            <RatingBar
              key={rating}
              rating={parseInt(rating)}
              count={count}
              total={ratingData.totalReviews}
            />
          ))}
        </div>
      )}
    </div>
  );
};
