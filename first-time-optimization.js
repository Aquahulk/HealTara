// ============================================================================
// ⚡ FIRST-TIME VISITOR OPTIMIZATION - Critical for Live Website
// ============================================================================
// Add this to your homepage for instant loading for new visitors
// ============================================================================

// 1. ADD PRELOADING HEADERS (Add to your layout.tsx or _document.tsx)
/*
import Head from 'next/head';

// In your component:
<Head>
  {/* Preload critical resources */}
  <link rel="preload" href="/api/hospitals" as="fetch" crossOrigin="anonymous" />
  <link rel="preload" href="/api/doctors?sort=trending&page=1&pageSize=12" as="fetch" crossOrigin="anonymous" />
  <link rel="dns-prefetch" href="//localhost:3001" />
  <link rel="preconnect" href="//localhost:3001" crossOrigin="anonymous" />
  
  {/* Preload critical fonts */}
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
  
  {/* Critical CSS inline */}
  <style dangerouslySetInnerHTML={{
    __html: `
      /* Critical CSS for above-the-fold content */
      .loading-spinner { 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255,255,255,0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `
  }} />
</Head>
*/

// 2. OPTIMIZED DATA LOADING FOR FIRST-TIME VISITORS
/*
useEffect(() => {
  const loadData = async () => {
    const startTime = performance.now();
    
    try {
      setLoading(true);

      // 🚀 FIRST-TIME VISITOR OPTIMIZATION
      const isFirstVisit = !localStorage.getItem('has_visited_before');
      const now = Date.now();
      
      // Check cache first (for returning visitors)
      const cachedHospitals = localStorage.getItem('hospitals_cache');
      const cachedDoctors = localStorage.getItem('doctors_cache');
      const cacheTimestamp = localStorage.getItem('cache_timestamp');
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      // ⚡ RETURNING VISITORS: Load from cache instantly
      if (!isFirstVisit && cachedHospitals && cachedDoctors && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
        console.log('⚡ Returning visitor: Loading from cache');
        setHospitals(JSON.parse(cachedHospitals));
        setDoctors(JSON.parse(cachedDoctors));
        setLoading(false);
        
        // Fetch fresh data in background
        setTimeout(() => fetchFreshData(), 100);
      } else {
        // 🆕 FIRST-TIME VISITORS: Optimized loading
        console.log('🆕 First-time visitor: Optimized loading');
        await fetchFreshData();
      }

      async function fetchFreshData() {
        try {
          // 🚀 PARALLEL LOADING WITH TIMEOUTS
          const fetchWithTimeout = (url: string, timeout = 3000) => {
            return Promise.race([
              fetch(url),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), timeout)
              )
            ]);
          };

          // 🔄 Load critical data first, then secondary data
          const [hospitalsRes, doctorsRes] = await Promise.allSettled([
            fetchWithTimeout('/api/hospitals'),
            fetchWithTimeout('/api/doctors?sort=trending&page=1&pageSize=12')
          ]);

          // Process hospitals data
          if (hospitalsRes.status === 'fulfilled') {
            const hospitalsData = await hospitalsRes.value.json();
            setHospitals(hospitalsData.success ? hospitalsData.data || [] : []);
            localStorage.setItem('hospitals_cache', JSON.stringify(hospitalsData.success ? hospitalsData.data || [] : []));
          } else {
            console.warn('Hospitals timeout or error:', hospitalsRes.reason);
            setHospitals([]);
          }

          // Process doctors data
          if (doctorsRes.status === 'fulfilled') {
            const doctorsData = await doctorsRes.value.json();
            const list = doctorsData.success ? (Array.isArray(doctorsData.data) ? doctorsData.data : []) : [];
            setDoctors(list);
            localStorage.setItem('doctors_cache', JSON.stringify(list));
          } else {
            console.warn('Doctors timeout or error:', doctorsRes.reason);
            setDoctors([]);
          }

          // Mark as visited for future optimizations
          localStorage.setItem('has_visited_before', 'true');
          localStorage.setItem('first_visit_time', now.toString());
          localStorage.setItem('cache_timestamp', now.toString());
          
          setLoading(false);
          
          const loadTime = performance.now() - startTime;
          console.log(`📊 Homepage loaded in ${loadTime.toFixed(2)}ms`);
          
          // 📊 Analytics: Track performance
          if (typeof gtag !== 'undefined') {
            gtag('event', 'page_load_time', {
              custom_parameter: loadTime,
              is_first_visit: isFirstVisit
            });
          }
          
        } catch (error) {
          console.error('Error loading data:', error);
          setLoading(false);
          
          // 🆘 FALLBACK: Show minimal data to avoid broken experience
          setHospitals([]);
          setDoctors([]);
        }
      }

    } catch (error) {
      console.error('Critical error:', error);
      setLoading(false);
    }
  };

  loadData();
}, []);
*/

// 3. PROGRESSIVE LOADING COMPONENT
/*
// Add this loading component for better UX
const OptimizedLoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <div className="mt-4 text-white text-center">
      <div className="text-lg font-semibold mb-2">Loading Healthcare Providers...</div>
      <div className="text-sm opacity-80">Finding the best doctors for you</div>
    </div>
  </div>
);

// Replace your loading check with:
if (loading) {
  return <OptimizedLoadingSpinner />;
}
*/

// 4. SERVICE WORKER FOR OFFLINE SUPPORT (Add to public/sw.js)
/*
const CACHE_NAME = 'healtara-v1';
const urlsToCache = [
  '/',
  '/api/hospitals',
  '/api/doctors?sort=trending&page=1&pageSize=12',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
*/

// 5. CRITICAL IMAGE OPTIMIZATION
/*
// Add to your component
useEffect(() => {
  // Preload critical images for first-time visitors
  const preloadCriticalImages = () => {
    const criticalImages = [
      '/api/placeholder/400/300/doctor',
      '/api/placeholder/400/300/hospital',
      '/logo.png',
      '/hero-bg.jpg'
    ];
    
    criticalImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  };
  
  // Preload after initial load to not block rendering
  setTimeout(preloadCriticalImages, 1000);
}, []);
*/

console.log('🚀 First-Time Visitor Optimization Ready!');
console.log('📋 Benefits:');
console.log('⚡ Instant loading for returning visitors');
console.log('🆕 Optimized loading for first-time visitors');
console.log('🔄 Progressive loading with timeouts');
console.log('📱 Better loading states');
console.log('📊 Performance tracking');
console.log('🔧 Fallback handling');
