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

  // Check if item is saved on mount
  useEffect(() => {
    if (user) {
      checkSavedStatus();
    }
  }, [user, entityId]);

  const checkSavedStatus = async () => {
    try {
      const data = await apiClient.checkSavedStatus(entityType, entityId);
      setIsSaved(data.saved);
    } catch (error) {
      console.error('Error checking saved status:', error);
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

    try {
      if (isSaved) {
        // DELETE
        await apiClient.unsaveItem(entityType, entityId);
        setIsSaved(false);
      } else {
        // POST
        await apiClient.saveItem(entityType, entityId);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
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
        className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} 
      />
    </button>
  );
}
