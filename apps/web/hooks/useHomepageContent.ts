// ============================================================================
// 🏠 USE HOMEPAGE CONTENT HOOK - React hook for dynamic homepage content
// ============================================================================

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { HomepageContent, DEFAULT_HOMEPAGE_CONTENT } from '@/lib/homepage-content';

export function useHomepageContent() {
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load content from API (admin-managed)
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Homepage Hook - Loading content from API...');
        
        // Fetch from API first (admin-managed content) with cache busting
        const apiContent = await apiClient.getHomepageContent();
        
        console.log('🔍 Homepage Hook - API response:', {
          hasContent: !!apiContent,
          keys: apiContent ? Object.keys(apiContent) : [],
          hasHero: !!apiContent?.hero,
          hasTrustedBy: !!apiContent?.trustedBy
        });
        
        if (apiContent && Object.keys(apiContent).length > 0) {
          setContent(apiContent);
          console.log('🔍 Homepage Hook - Using API content');
        } else {
          // Fallback to default content
          setContent(DEFAULT_HOMEPAGE_CONTENT);
          console.log('🔍 Homepage Hook - Using default content');
        }
      } catch (err) {
        console.error('Error loading homepage content from API:', err);
        setError('Failed to load homepage content');
        // Fallback to default content
        setContent(DEFAULT_HOMEPAGE_CONTENT);
        console.log('🔍 Homepage Hook - Error, using default content');
      } finally {
        setLoading(false);
      }
    };

    loadContent();

    // Listen for content updates from admin panel
    const handleContentUpdate = (event: CustomEvent) => {
      console.log('🔍 Homepage Hook - Received content update event:', event.detail);
      setContent(event.detail);
    };

    window.addEventListener('homepage-content-updated', handleContentUpdate as EventListener);

    // Also listen for storage changes (in case admin panel is in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'homepage-content-update') {
        console.log('🔍 Homepage Hook - Storage change detected, reloading...');
        loadContent();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('homepage-content-updated', handleContentUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { content, loading, error };
}
