import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

interface SaveButtonProps {
  entityType: 'doctor' | 'hospital';
  entityId: number | string;
  className?: string;
}

export default function SaveButton({ entityType, entityId, className = '' }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Get localStorage key for this item
  const getStorageKey = () => `saved_${entityType}_${entityId}`;

  // Initialize state from localStorage first, then verify with API
  useEffect(() => {
    // Check localStorage first for instant UI
    const savedState = localStorage.getItem(getStorageKey());
    console.log('🔍 Bookmark Debug - Mount:', {
      entityType,
      entityId,
      localStorageState: savedState,
      isLoggedIn: !!user
    });
    
    if (savedState === 'true') {
      setIsSaved(true);
      console.log('🔍 Bookmark Debug - Set state from localStorage: true');
    }
    
    // Only verify with API if user is logged in
    if (user) {
      checkSavedStatus();
    } else {
      console.log('🔍 Bookmark Debug - User not logged in, skipping API call');
    }
  }, [user, entityId]);

  const checkSavedStatus = async () => {
    try {
      console.log('🔍 Bookmark Debug - Checking API status...');
      const data = await apiClient.checkSavedStatus(entityType, entityId);
      console.log('🔍 Bookmark Debug - API response:', data);
      
      setIsSaved(data.saved);
      // Update localStorage with actual state from server
      localStorage.setItem(getStorageKey(), String(data.saved));
      console.log('🔍 Bookmark Debug - Updated state from API:', data.saved);
    } catch (error) {
      console.error('Error checking saved status:', error);
      // If API fails, keep localStorage state
      console.log('🔍 Bookmark Debug - API failed, keeping localStorage state');
    }
  };

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Redirect to login if not authenticated
      router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (loading) return;
    setLoading(true);

    // 🚀 INSTANT UPDATE: Optimistic UI update
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    localStorage.setItem(getStorageKey(), String(newSavedState));

    try {
      if (newSavedState) {
        // POST - Save item
        await apiClient.saveItem(entityType, entityId);
      } else {
        // DELETE - Unsave item
        await apiClient.unsaveItem(entityType, entityId);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      // Revert on error
      setIsSaved(!newSavedState);
      localStorage.setItem(getStorageKey(), String(!newSavedState));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleSave}
      disabled={loading}
      className={`p-2 rounded-full transition-all duration-200 z-10 ${
        isSaved 
          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm' 
          : 'bg-white/80 text-gray-400 hover:bg-white hover:text-blue-500 shadow-sm backdrop-blur-sm'
      } ${className}`}
      aria-label={isSaved ? "Remove from saved" : "Save"}
      title={isSaved ? "Remove from saved" : "Save"}
    >
      <Bookmark 
        className={`w-5 h-5 ${isSaved ? 'fill-current' : ''} ${loading ? 'animate-pulse' : ''}`} 
      />
    </button>
  );
}
