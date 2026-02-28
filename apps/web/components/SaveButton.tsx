import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface SaveButtonProps {
  entityType: 'doctor' | 'hospital';
  entityId: number | string;
  className?: string;
}

export default function SaveButton({ entityType, entityId, className = '' }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuth();
  const router = useRouter();

  // Check if item is saved on mount
  useEffect(() => {
    if (user && token) {
      checkSavedStatus();
    }
  }, [user, token, entityId]);

  const checkSavedStatus = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/saved/check?entityType=${entityType}&entityId=${entityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.saved);
      }
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
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/saved`;
      
      if (isSaved) {
        // DELETE
        const deleteUrl = `${url}?entityType=${entityType}&entityId=${entityId}`;
        const res = await fetch(deleteUrl, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (res.ok) setIsSaved(false);
      } else {
        // POST
        const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entityType, entityId })
        });
        if (res.ok) setIsSaved(true);
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
