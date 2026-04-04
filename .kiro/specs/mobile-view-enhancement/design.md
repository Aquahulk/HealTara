# Design Document: Mobile View Enhancement

## Overview

This design document outlines the comprehensive mobile-first responsive enhancement for the Healtara healthcare application. The application is built with Next.js 15, React 19, and Tailwind CSS 4, and currently has a basic mobile implementation with a bottom navigation component. This enhancement will transform the entire application into a mobile-optimized experience that matches or exceeds desktop functionality.

### Goals

- Implement mobile-first responsive design across all pages and components
- Optimize touch interactions for mobile devices (minimum 44x44px touch targets)
- Enhance mobile navigation with bottom navigation and hamburger menu
- Improve mobile performance (FCP < 2s on 3G networks)
- Ensure mobile accessibility (WCAG 2.1 AA compliance)
- Support mobile-specific features (gestures, native APIs, PWA capabilities)

### Non-Goals

- Redesigning the desktop experience (maintain existing desktop layouts)
- Building native mobile applications (focus on responsive web)
- Implementing offline-first architecture (basic offline indicators only)
- Changing the core business logic or API contracts

### Technology Stack

- **Framework**: Next.js 15.4.5 with App Router
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS 4.1.14
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: React Context API (AuthContext)
- **API Client**: Custom axios-based client with caching
- **Real-time**: Socket.io client

## Architecture

### Component Architecture

The mobile enhancement follows a layered architecture:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Mobile-Responsive Components)         │
├─────────────────────────────────────────┤
│         Layout Layer                    │
│  (AppShell, MobileLayout, Responsive)   │
├─────────────────────────────────────────┤
│         State Management Layer          │
│  (Context, Hooks, Local State)          │
├─────────────────────────────────────────┤
│         Service Layer                   │
│  (API Client, Performance, Cache)       │
└─────────────────────────────────────────┘
```

### Responsive Breakpoint Strategy

Tailwind CSS breakpoints will be used consistently:

- **Mobile**: < 640px (default, mobile-first)
- **sm**: ≥ 640px (large phones, small tablets)
- **md**: ≥ 768px (tablets, small laptops)
- **lg**: ≥ 1024px (laptops, desktops)
- **xl**: ≥ 1280px (large desktops)

Mobile-specific styles will be applied by default, with progressive enhancement for larger screens using `md:`, `lg:`, and `xl:` prefixes.

### Mobile Layout System

A new `MobileLayout` component will wrap page content and provide:

- Responsive padding (16px minimum on mobile)
- Bottom navigation spacing (64px bottom padding on mobile)
- Scroll container management
- Viewport height calculations (accounting for mobile browser chrome)

## Components and Interfaces

### 1. Enhanced MobileBottomNavigation Component

**Location**: `apps/web/components/MobileBottomNavigation.tsx`

**Current State**: Basic bottom navigation with 4 items (Doctors, Hospitals, Booking, Search)

**Enhancements**:
- Active state highlighting with visual feedback
- Touch-optimized sizing (minimum 44x44px touch targets)
- Smooth transitions and animations
- Accessibility labels and ARIA attributes
- Fixed positioning with proper z-index management

**Interface**:
```typescript
interface MobileBottomNavigationProps {
  currentPath?: string; // For active state highlighting
  className?: string;
}
```

### 2. MobileHeader Component

**Location**: `apps/web/components/MobileHeader.tsx` (new)

**Purpose**: Mobile-optimized header with reduced height and hamburger menu

**Features**:
- Maximum 64px height on mobile
- Hamburger menu toggle
- Collapsible user menu
- Optional scroll-to-hide behavior
- Sticky positioning

**Interface**:
```typescript
interface MobileHeaderProps {
  hideOnScroll?: boolean;
  showLogo?: boolean;
  showBookButton?: boolean;
}
```

### 3. MobileSearchInterface Component

**Location**: `apps/web/components/MobileSearchInterface.tsx` (new)

**Purpose**: Mobile-optimized search with autocomplete and filters

**Features**:
- Single-column layout
- Minimum 48px input height
- Collapsible filter accordion
- Mobile-optimized dropdown (max viewport height)
- Clear button (X icon)
- Auto-scroll on focus

**Interface**:
```typescript
interface MobileSearchInterfaceProps {
  initialQuery?: string;
  onSearch: (query: string, filters: SearchFilters) => void;
  suggestions?: string[];
  loading?: boolean;
}

interface SearchFilters {
  specialization?: string;
  city?: string;
  availability?: string;
  isOnline?: boolean;
}
```

### 4. MobileDoctorCard Component

**Location**: `apps/web/components/MobileDoctorCard.tsx` (new)

**Purpose**: Mobile-optimized doctor card with vertical layout

**Features**:
- Single-column layout
- 1:1 aspect ratio image (max 80px)
- Vertical information stack
- Horizontal action buttons (44px height minimum)
- Text truncation with ellipsis
- Touch feedback animations

**Interface**:
```typescript
interface MobileDoctorCardProps {
  doctor: Doctor;
  onBookAppointment?: () => void;
  onBookClick?: (doctorId: number) => void;
  searchQuery?: string;
  variant?: 'compact' | 'full';
}
```

### 5. MobileModal Component

**Location**: `apps/web/components/MobileModal.tsx` (new)

**Purpose**: Full-screen modal for mobile devices

**Features**:
- Full-screen overlay on mobile
- Swipe-down to dismiss gesture
- Fixed bottom action bar
- Keyboard-aware positioning
- Smooth animations

**Interface**:
```typescript
interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  dismissible?: boolean;
  fullScreen?: boolean; // Force full-screen even on tablets
}
```

### 6. Enhanced BookAppointmentModal

**Location**: `apps/web/components/BookAppointmentModal.tsx`

**Enhancements**:
- Full-screen on mobile (< 768px)
- Single-column form layout
- Native date/time pickers
- Minimum 48px input height
- Fixed bottom action bar
- Keyboard-aware scrolling
- Inline error messages

### 7. MobileHospitalCard Component

**Location**: `apps/web/components/MobileHospitalCard.tsx` (new)

**Purpose**: Mobile-optimized hospital card

**Features**:
- Single-column layout
- Horizontal scrollable department filters
- Swipeable image carousel
- Tappable phone/address links
- Collapsible sections (hours, departments)

**Interface**:
```typescript
interface MobileHospitalCardProps {
  hospital: Hospital;
  onDepartmentSelect?: (department: string) => void;
  showDoctors?: boolean;
}
```

### 8. MobileGestureHandler Component

**Location**: `apps/web/components/MobileGestureHandler.tsx` (new)

**Purpose**: Reusable gesture handling wrapper

**Features**:
- Swipe detection (left, right, up, down)
- Pull-to-refresh
- Long-press detection
- Pinch-to-zoom
- Momentum scrolling

**Interface**:
```typescript
interface MobileGestureHandlerProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPullRefresh?: () => Promise<void>;
  onLongPress?: () => void;
  children: React.ReactNode;
  enablePinchZoom?: boolean;
}
```

### 9. MobileLayout Component

**Location**: `apps/web/components/MobileLayout.tsx` (new)

**Purpose**: Wrapper component for mobile-specific layout concerns

**Features**:
- Responsive padding management
- Bottom navigation spacing
- Safe area insets (iOS notch support)
- Scroll restoration
- Viewport height calculations

**Interface**:
```typescript
interface MobileLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  showHeader?: boolean;
  className?: string;
}
```

### 10. TouchFeedback Component

**Location**: `apps/web/components/TouchFeedback.tsx` (new)

**Purpose**: Reusable touch feedback wrapper

**Features**:
- Visual feedback (scale, opacity)
- Haptic feedback (vibration API)
- Debounce protection (300ms)
- Ripple effect animation

**Interface**:
```typescript
interface TouchFeedbackProps {
  children: React.ReactNode;
  onPress?: () => void;
  haptic?: boolean;
  ripple?: boolean;
  debounce?: number;
}
```

## Data Models

### ViewportInfo

```typescript
interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean; // < 768px
  isTablet: boolean; // 768px - 1024px
  isDesktop: boolean; // >= 1024px
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
```

### TouchEvent

```typescript
interface TouchEventData {
  type: 'tap' | 'swipe' | 'longpress' | 'pinch';
  direction?: 'left' | 'right' | 'up' | 'down';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  distance?: number;
  scale?: number; // For pinch gestures
}
```

### MobilePerformanceMetrics

```typescript
interface MobilePerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  networkType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  deviceMemory?: number;
  hardwareConcurrency?: number;
}
```

## Hooks and Utilities

### useViewport Hook

**Location**: `apps/web/hooks/useViewport.ts` (new)

**Purpose**: Reactive viewport information

```typescript
function useViewport(): ViewportInfo {
  // Returns current viewport dimensions and device type
  // Updates on resize and orientation change
}
```

### useTouchGesture Hook

**Location**: `apps/web/hooks/useTouchGesture.ts` (new)

**Purpose**: Gesture detection and handling

```typescript
function useTouchGesture(options: TouchGestureOptions): TouchGestureHandlers {
  // Returns gesture event handlers
  // Detects swipes, long-press, pinch, etc.
}
```

### useMobileKeyboard Hook

**Location**: `apps/web/hooks/useMobileKeyboard.ts` (new)

**Purpose**: Mobile keyboard state detection

```typescript
function useMobileKeyboard(): {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
  scrollToInput: (element: HTMLElement) => void;
}
```

### useMobilePerformance Hook

**Location**: `apps/web/hooks/useMobilePerformance.ts` (new)

**Purpose**: Performance monitoring for mobile

```typescript
function useMobilePerformance(): {
  metrics: MobilePerformanceMetrics;
  reportMetric: (name: string, value: number) => void;
}
```

### Mobile Utility Functions

**Location**: `apps/web/lib/mobile-utils.ts` (new)

```typescript
// Device detection
export function isMobileDevice(): boolean;
export function isIOS(): boolean;
export function isAndroid(): boolean;
export function isTouchDevice(): boolean;

// Viewport utilities
export function getViewportHeight(): number; // Accounts for mobile chrome
export function getSafeAreaInsets(): SafeAreaInsets;

// Touch utilities
export function preventZoom(element: HTMLElement): void;
export function enableMomentumScrolling(element: HTMLElement): void;

// Performance utilities
export function lazyLoadImage(src: string): Promise<string>;
export function prefetchRoute(path: string): void;

// Gesture utilities
export function detectSwipe(touchStart: Touch, touchEnd: Touch): SwipeDirection | null;
export function isLongPress(touchStart: number, touchEnd: number): boolean;
```

## State Management

### MobileContext

**Location**: `apps/web/context/MobileContext.tsx` (new)

**Purpose**: Global mobile-specific state

```typescript
interface MobileContextValue {
  viewport: ViewportInfo;
  isBottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
  isHamburgerMenuOpen: boolean;
  setHamburgerMenuOpen: (open: boolean) => void;
  performanceMetrics: MobilePerformanceMetrics;
}

export function MobileProvider({ children }: { children: React.ReactNode }): JSX.Element;
export function useMobile(): MobileContextValue;
```

## Styling Strategy

### Tailwind Configuration

Extend Tailwind config with mobile-specific utilities:

```javascript
// tailwind.config.js additions
module.exports = {
  theme: {
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '44px', // Minimum touch target
        'screen-mobile': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [
    // Custom plugin for mobile utilities
    function({ addUtilities }) {
      addUtilities({
        '.touch-target': {
          minWidth: '44px',
          minHeight: '44px',
        },
        '.prevent-zoom': {
          touchAction: 'manipulation',
        },
        '.momentum-scroll': {
          '-webkit-overflow-scrolling': 'touch',
        },
      });
    },
  ],
};
```

### Mobile-First CSS Patterns

```css
/* Mobile-first approach - base styles are mobile */
.component {
  /* Mobile styles (default) */
  padding: 1rem;
  font-size: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .component {
    padding: 2rem;
    font-size: 1.125rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .component {
    padding: 3rem;
    font-size: 1.25rem;
  }
}
```

### Touch-Optimized Styles

```css
/* Touch target sizing */
.btn-mobile {
  @apply min-h-[44px] min-w-[44px] px-4 py-2;
}

/* Touch feedback */
.touch-feedback {
  @apply active:scale-95 active:opacity-80 transition-transform duration-100;
}

/* Prevent text selection on touch */
.no-select {
  @apply select-none;
  -webkit-tap-highlight-color: transparent;
}
```

## Performance Optimization

### Image Optimization Strategy

1. **Responsive Images**: Use Next.js Image component with mobile-optimized sizes
2. **Lazy Loading**: Implement intersection observer for below-fold images
3. **Format Selection**: Serve WebP with JPEG fallback
4. **Size Variants**: Generate 320w, 640w, 768w, 1024w variants

```typescript
// Mobile image component
<Image
  src={doctor.image}
  alt={doctor.name}
  width={80}
  height={80}
  sizes="(max-width: 768px) 80px, 120px"
  loading="lazy"
  quality={75}
/>
```

### Code Splitting Strategy

1. **Route-based splitting**: Automatic with Next.js App Router
2. **Component-level splitting**: Dynamic imports for heavy components
3. **Mobile-specific bundles**: Conditional loading based on viewport

```typescript
// Dynamic import for mobile-only components
const MobileGestureHandler = dynamic(
  () => import('@/components/MobileGestureHandler'),
  { ssr: false }
);
```

### Caching Strategy

1. **API Response Caching**: 10-minute cache for frequently accessed data
2. **Image Caching**: Browser cache + service worker
3. **Route Prefetching**: Prefetch likely next routes on mobile

```typescript
// Enhanced caching for mobile
const MOBILE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function loadWithMobileCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check localStorage first
  const cached = localStorage.getItem(key);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < MOBILE_CACHE_DURATION) {
      return data;
    }
  }
  
  // Fetch fresh data
  const data = await fetcher();
  localStorage.setItem(key, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
  
  return data;
}
```

### Virtual Scrolling

For lists exceeding 50 items, implement virtual scrolling:

```typescript
// Virtual scroll component for mobile
import { useVirtualizer } from '@tanstack/react-virtual';

function MobileDoctorList({ doctors }: { doctors: Doctor[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: doctors.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated card height
    overscan: 5, // Render 5 extra items
  });
  
  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <MobileDoctorCard doctor={doctors[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Mobile-Specific Features

### PWA Configuration

**Location**: `apps/web/public/manifest.json` (new)

```json
{
  "name": "Healtara - Healthcare Appointments",
  "short_name": "Healtara",
  "description": "Book doctor appointments easily",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0F766E",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Native API Integration

```typescript
// Location API
export async function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

// Share API
export async function shareContent(data: ShareData): Promise<void> {
  if (!navigator.share) {
    // Fallback to copy to clipboard
    await navigator.clipboard.writeText(data.url || '');
    return;
  }
  await navigator.share(data);
}

// Vibration API
export function hapticFeedback(pattern: number | number[] = 10): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// Add to Home Screen
export function promptInstallPWA(): void {
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    // Show custom install prompt
  });
}
```

### Biometric Authentication

```typescript
// Web Authentication API for biometric login
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return false;
  }
  
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32), // Server-provided challenge
        timeout: 60000,
        userVerification: 'required',
      }
    });
    
    return !!credential;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
}
```

## Accessibility

### Mobile Accessibility Requirements

1. **Touch Targets**: Minimum 44x44px for all interactive elements
2. **Focus Indicators**: Visible focus states for keyboard navigation
3. **ARIA Labels**: Proper labeling for screen readers
4. **Contrast Ratios**: Minimum 4.5:1 for text
5. **Text Scaling**: Support up to 200% zoom without layout breaks
6. **Screen Reader Announcements**: Navigation changes announced

### Implementation

```typescript
// Accessible mobile button
<button
  className="min-h-[44px] min-w-[44px] touch-target"
  aria-label="Book appointment with Dr. Smith"
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleBooking();
    }
  }}
>
  Book Now
</button>

// Screen reader announcements
import { useEffect } from 'react';

function announceToScreenReader(message: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
```

## Error Handling

### Mobile-Specific Error Handling

```typescript
// Mobile error boundary
class MobileErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to mobile analytics
    logMobileError(error, errorInfo);
    
    // Show mobile-friendly error UI
    this.setState({ hasError: true, error });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-white">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              We're sorry for the inconvenience. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-brand px-6 py-3 rounded-lg"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Network error handling
export function handleMobileNetworkError(error: Error): string {
  if (!navigator.onLine) {
    return 'You appear to be offline. Please check your connection.';
  }
  
  if (error.message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  return 'Network error occurred. Please try again.';
}

// Form validation errors
export function showMobileFormError(
  fieldId: string,
  message: string
): void {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  // Scroll to error field
  field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Show error message
  const errorEl = document.createElement('div');
  errorEl.className = 'text-red-600 text-sm mt-1';
  errorEl.textContent = message;
  field.parentElement?.appendChild(errorEl);
  
  // Haptic feedback
  hapticFeedback([10, 50, 10]);
}
```

### Offline Handling

```typescript
// Offline indicator component
function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (isOnline) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 px-4 text-center z-50">
      <span className="text-sm font-medium">
        You're offline. Some features may not work.
      </span>
    </div>
  );
}
```

## Testing Strategy

### Mobile Testing Approach

The testing strategy combines unit tests for logic, property-based tests for universal behaviors, and manual testing on real devices.

#### Unit Testing

Focus on:
- Component rendering with different viewport sizes
- Touch event handling
- Gesture detection logic
- Mobile-specific utility functions
- Error boundary behavior

```typescript
// Example unit test
describe('MobileDoctorCard', () => {
  it('renders with minimum touch target size', () => {
    const { getByRole } = render(<MobileDoctorCard doctor={mockDoctor} />);
    const bookButton = getByRole('button', { name: /book/i });
    
    const styles = window.getComputedStyle(bookButton);
    expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44);
  });
  
  it('truncates long text with ellipsis', () => {
    const longNameDoctor = { ...mockDoctor, name: 'A'.repeat(100) };
    const { container } = render(<MobileDoctorCard doctor={longNameDoctor} />);
    
    const nameElement = container.querySelector('.doctor-name');
    expect(nameElement).toHaveClass('truncate');
  });
});
```

#### Property-Based Testing

Property-based tests will be written after completing the prework analysis in the Correctness Properties section below.

#### Device Testing Matrix

Test on the following devices and browsers:

**iOS Devices**:
- iPhone SE (320px width) - Safari
- iPhone 12/13 (390px width) - Safari
- iPhone 14 Pro Max (430px width) - Safari
- iPad Mini (768px width) - Safari

**Android Devices**:
- Samsung Galaxy S21 (360px width) - Chrome Mobile
- Google Pixel 6 (412px width) - Chrome Mobile
- Samsung Galaxy Tab (768px width) - Samsung Internet

**Testing Tools**:
- Chrome DevTools Device Mode
- BrowserStack for real device testing
- Lighthouse for performance audits
- axe DevTools for accessibility testing

### Performance Testing

```typescript
// Performance monitoring
describe('Mobile Performance', () => {
  it('achieves FCP < 2s on 3G', async () => {
    // Simulate 3G network
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 100, // 100ms RTT
    });
    
    await page.goto('/');
    const metrics = await page.metrics();
    
    expect(metrics.FirstContentfulPaint).toBeLessThan(2000);
  });
  
  it('maintains 60fps during animations', async () => {
    const fps = await measureFrameRate(() => {
      // Trigger animation
      page.click('.animated-button');
    });
    
    expect(fps).toBeGreaterThanOrEqual(60);
  });
});
```

### Accessibility Testing

```typescript
// Accessibility tests
describe('Mobile Accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<MobileDoctorCard doctor={mockDoctor} />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });
  
  it('supports keyboard navigation', () => {
    const { getByRole } = render(<MobileDoctorCard doctor={mockDoctor} />);
    const bookButton = getByRole('button', { name: /book/i });
    
    bookButton.focus();
    expect(bookButton).toHaveFocus();
    
    fireEvent.keyDown(bookButton, { key: 'Enter' });
    expect(mockOnBook).toHaveBeenCalled();
  });
  
  it('announces navigation changes to screen readers', () => {
    const { container } = render(<MobileBottomNavigation />);
    const announcement = container.querySelector('[role="status"]');
    
    expect(announcement).toBeInTheDocument();
    expect(announcement).toHaveAttribute('aria-live', 'polite');
  });
});
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all 126 acceptance criteria, I identified the following redundancies and consolidations:

**Redundancy Analysis**:
1. Multiple properties test "minimum touch target size of 44px" (2.1, 5.5, 9.4, 10.7) → Consolidated into Property 1
2. Multiple properties test "single-column layout on mobile" (4.1, 5.1, 6.2, 8.1, 9.3, 10.1) → Consolidated into Property 2
3. Multiple properties test "minimum input height of 48px" (4.2, 6.4, 10.4) → Consolidated into Property 3
4. Multiple properties test "font size minimums" (2.5, 16.1) → Consolidated into Property 4
5. Multiple properties test "proper ARIA attributes" (12.2, 12.6, 12.7) → Consolidated into Property 5
6. Multiple properties test "tappable links for contact info" (8.5, 17.3, 17.5) → Consolidated into Property 6
7. Multiple properties test "text truncation with ellipsis" (5.6) and "line length limits" (16.4) → Related but distinct, kept separate
8. Multiple properties test "lazy loading" (11.2) and "image optimization" (1.6, 1.7) → Related but distinct, kept separate

**Properties Eliminated as Redundant**:
- Properties testing the same dimension requirements across different components were consolidated
- Properties testing similar layout patterns were combined into more general properties
- Properties testing specific examples on specific pages were kept as examples, not properties

### Universal Properties

These properties apply across all components and pages:

### Property 1: Touch Target Minimum Size

*For any* interactive element (button, link, input, checkbox) on mobile devices (viewport < 768px), the computed width and height SHALL both be at least 44 pixels.

**Validates: Requirements 2.1, 5.5, 9.4, 10.7**

### Property 2: Mobile Single-Column Layout

*For any* page or component container on mobile devices (viewport < 768px), the layout SHALL use a single-column grid (grid-cols-1 or flex-col) for primary content areas.

**Validates: Requirements 4.1, 5.1, 6.2, 8.1, 9.3, 10.1**

### Property 3: Mobile Input Height

*For any* form input field (text, email, password, select) on mobile devices (viewport < 768px), the computed height SHALL be at least 48 pixels.

**Validates: Requirements 4.2, 6.4, 10.4**

### Property 4: Mobile Typography Minimums

*For any* text element on mobile devices (viewport < 768px), the computed font size SHALL be at least 16 pixels for body text and button text.

**Validates: Requirements 2.5, 16.1**

### Property 5: Accessibility Attributes

*For any* interactive element or form input, the element SHALL have either an aria-label, aria-labelledby, or a visible label element, and images SHALL have alt text.

**Validates: Requirements 12.2, 12.6, 12.7**

### Property 6: Tappable Contact Links

*For any* displayed phone number, email address, or physical address on mobile devices, the element SHALL be wrapped in a link with appropriate href (tel:, mailto:, or geo:/maps:).

**Validates: Requirements 8.5, 17.3, 17.5**

### Property 7: No Horizontal Scroll

*For any* page rendered at mobile viewport widths (< 768px), the document.body.scrollWidth SHALL NOT exceed window.innerWidth.

**Validates: Requirements 1.2**

### Property 8: Responsive Padding

*For any* page container on mobile devices (viewport < 768px), the computed padding-left and padding-right SHALL each be at least 16 pixels.

**Validates: Requirements 1.5**

### Property 9: Image Containment

*For any* image element on mobile devices, the computed width SHALL NOT exceed its parent container's width.

**Validates: Requirements 1.6**

### Property 10: Touch Feedback Timing

*For any* interactive element with touch feedback, visual feedback (opacity or scale change) SHALL occur within 100 milliseconds of the touchstart event.

**Validates: Requirements 2.3**

### Property 11: Double-Tap Prevention

*For any* button or interactive element, when tapped twice within 300 milliseconds, only one action SHALL be triggered.

**Validates: Requirements 2.4**

### Property 12: Interactive Element Spacing

*For any* two adjacent interactive elements on mobile devices, the computed gap or margin between them SHALL be at least 8 pixels.

**Validates: Requirements 2.2**

### Property 13: Border Radius for Touch Affordance

*For any* interactive element (button, input, card) on mobile devices, the computed border-radius SHALL be at least 8 pixels.

**Validates: Requirements 2.6**

### Property 14: Bottom Navigation Visibility

*For any* page on mobile devices (viewport < 768px), the MobileBottomNavigation component SHALL be present in the DOM and have position: fixed with bottom: 0.

**Validates: Requirements 3.1, 3.2**

### Property 15: Active Navigation Highlighting

*For any* navigation item in the bottom navigation, when the current route matches the item's path, the item SHALL have a distinct active class or style applied.

**Validates: Requirements 3.4**

### Property 16: Text Truncation

*For any* text element with content exceeding its container width, the element SHALL have either text-overflow: ellipsis with overflow: hidden, or a line-clamp applied.

**Validates: Requirements 5.6**

### Property 17: Form Error Placement

*For any* form input with a validation error, the error message SHALL be rendered as a sibling element immediately following the input in the DOM.

**Validates: Requirements 6.7**

### Property 18: Keyboard Type Optimization

*For any* form input on mobile devices, the input SHALL have an appropriate type (email, tel, number) or inputMode attribute matching the expected data format.

**Validates: Requirements 10.2**

### Property 19: First Contentful Paint Performance

*For any* page load on a simulated 3G network (1.5 Mbps download, 750 Kbps upload, 100ms latency), the First Contentful Paint metric SHALL be less than 2000 milliseconds.

**Validates: Requirements 11.1**

### Property 20: Lazy Loading Images

*For any* image element that is initially below the viewport fold, the image SHALL have loading="lazy" attribute or be loaded via intersection observer.

**Validates: Requirements 11.2**

### Property 21: Virtual Scrolling for Large Lists

*For any* list of items exceeding 50 elements on mobile devices, the list SHALL implement virtual scrolling (rendering only visible items plus overscan).

**Validates: Requirements 11.3**

### Property 22: Animation Performance

*For any* CSS animation or transition, the animated properties SHALL be limited to transform and opacity (GPU-accelerated properties).

**Validates: Requirements 11.5**

### Property 23: API Response Caching

*For any* API request for frequently accessed data (doctors list, hospitals list), the response SHALL be cached in localStorage or sessionStorage with a timestamp, and served from cache if less than 10 minutes old.

**Validates: Requirements 11.6**

### Property 24: Keyboard Accessibility

*For any* interactive element, the element SHALL be focusable via keyboard (tabIndex >= 0 or naturally focusable) and respond to Enter or Space key presses.

**Validates: Requirements 12.1**

### Property 25: Color Contrast Ratio

*For any* text element on mobile devices, the contrast ratio between text color and background color SHALL be at least 4.5:1.

**Validates: Requirements 12.3**

### Property 26: Visible Focus Indicator

*For any* interactive element when focused, the element SHALL have a visible outline or ring with at least 2px width and contrasting color.

**Validates: Requirements 12.4**

### Property 27: Text Scaling Support

*For any* page or component, when the root font size is increased to 200%, the layout SHALL NOT have horizontal overflow and all text SHALL remain readable.

**Validates: Requirements 12.5**

### Property 28: Swipe Gesture Support

*For any* carousel or swipeable container, horizontal swipe gestures (touchstart → touchmove → touchend with horizontal distance > 50px) SHALL trigger navigation to the next/previous item.

**Validates: Requirements 13.1**

### Property 29: Pull-to-Refresh Gesture

*For any* scrollable list page on mobile devices, a pull-down gesture at scroll position 0 (touchstart → touchmove downward > 100px → touchend) SHALL trigger a refresh action.

**Validates: Requirements 13.2**

### Property 30: Modal Swipe-to-Dismiss

*For any* modal on mobile devices, a swipe-down gesture (touchstart → touchmove downward > 100px → touchend) SHALL dismiss the modal.

**Validates: Requirements 13.3**

### Property 31: Pinch-to-Zoom on Images

*For any* image in a gallery or lightbox, pinch gestures (two-finger touch with changing distance) SHALL scale the image proportionally.

**Validates: Requirements 13.4**

### Property 32: Momentum Scrolling

*For any* scrollable container on mobile devices, the container SHALL have -webkit-overflow-scrolling: touch or equivalent CSS property for momentum scrolling.

**Validates: Requirements 13.5**

### Property 33: Gesture Conflict Prevention

*For any* element with custom touch gestures, the element SHALL have touch-action CSS property set to prevent conflicting browser gestures.

**Validates: Requirements 13.6**

### Property 34: Long-Press Context Menu

*For any* card or list item with long-press support, a touch lasting longer than 500 milliseconds SHALL trigger a context menu or action sheet.

**Validates: Requirements 13.7**

### Property 35: Content Item Count Reduction

*For any* grid or list of featured items, the number of items rendered on mobile devices (viewport < 768px) SHALL be less than or equal to the number rendered on desktop (viewport >= 1024px).

**Validates: Requirements 14.6**

### Property 36: Line Height for Readability

*For any* body text element on mobile devices, the computed line-height SHALL be between 1.5 and 1.7.

**Validates: Requirements 16.2**

### Property 37: Mobile Type Scale

*For any* heading element on mobile devices (viewport < 768px), the computed font size SHALL be: h1: 24-32px, h2: 20-24px, h3: 18-20px.

**Validates: Requirements 16.3**

### Property 38: Line Length Limit

*For any* paragraph or text block on mobile devices, the maximum width SHALL be set such that lines contain approximately 60-70 characters.

**Validates: Requirements 16.4**

### Property 39: Paragraph Spacing

*For any* paragraph element on mobile devices, the computed margin-bottom or padding-bottom SHALL be at least 16 pixels.

**Validates: Requirements 16.5**

### Property 40: System Font Usage

*For any* text element, the computed font-family SHALL include system fonts (system-ui, -apple-system, BlinkMacSystemFont) or web-safe fonts (Arial, Helvetica, sans-serif).

**Validates: Requirements 16.6**

### Property 41: Tabular Figures for Numbers

*For any* element displaying numerical data (prices, ratings, statistics), the computed font-variant-numeric SHALL include 'tabular-nums' or the element SHALL use a monospace font.

**Validates: Requirements 16.7**

### Property 42: Geolocation API Usage

*For any* location-based feature on mobile devices, when location is requested, the code SHALL call navigator.geolocation.getCurrentPosition() or navigator.geolocation.watchPosition().

**Validates: Requirements 17.1**

### Property 43: Native Share API

*For any* share button on mobile devices, when clicked, the code SHALL call navigator.share() if available, with fallback to clipboard copy.

**Validates: Requirements 17.4**

### Property 44: Biometric Authentication

*For any* login flow with biometric support, when biometric login is triggered, the code SHALL call navigator.credentials.get() with publicKey options.

**Validates: Requirements 17.6**

### Property 45: Haptic Feedback

*For any* important action (booking confirmation, error, success) on mobile devices with vibration support, the code SHALL call navigator.vibrate() with an appropriate pattern.

**Validates: Requirements 15.6**

### Property 46: Error Field Auto-Scroll

*For any* form with validation errors, when validation fails, the page SHALL automatically scroll to bring the first error field into the viewport.

**Validates: Requirements 15.7**

### Property 47: Lighthouse Performance Score

*For any* page on mobile devices, the Lighthouse mobile performance score SHALL be at least 85.

**Validates: Requirements 18.4**

### Example-Based Tests

These are specific scenarios that should be tested with concrete examples rather than property-based tests:

**Navigation Examples**:
- Bottom navigation contains exactly 4 items: Doctors, Hospitals, Booking, Search (3.3)
- Hamburger menu is visible on mobile and opens full-screen overlay (3.5, 3.6)
- Page content has 64px bottom padding when bottom nav is visible (3.7)
- Body scroll is prevented when hamburger menu is open (3.8)

**Search Interface Examples**:
- Search input has clear button (X icon) when text is entered (4.7)
- Filter options display in collapsible accordion on mobile (4.4)
- Search input scrolls to top of viewport when focused (4.5)
- Search results display in single-column list (4.6)

**Doctor Card Examples**:
- Doctor information displays in vertical stack (5.2)
- Essential information (name, specialization, fee, location) is visible (5.3)
- Action buttons display in horizontal row at bottom (5.4)
- Doctor image uses 1:1 aspect ratio with max 80px width (5.7)

**Booking Flow Examples**:
- Booking modal displays full-screen on mobile (6.1)
- Date/time inputs use native pickers (type="date", type="time") (6.3)
- Fixed bottom action bar contains submit button (6.6)
- Progress indicator shows for multi-step booking (6.8)

**Header Examples**:
- Header height is maximum 64px on mobile (7.1)
- Secondary navigation items hidden on mobile (7.2)
- Hero section height is maximum 60vh on mobile (7.3)
- Hero h1 font size is 24-32px on mobile (7.4)
- Book Appointment button remains visible on mobile (7.5)
- User menu collapses into dropdown on mobile (7.6)
- Header optionally hides on scroll (7.7)

**Hospital Page Examples**:
- Hospital info displays in single-column layout (8.1)
- Department filters in horizontal scrollable list (8.2)
- Doctor roster displays in vertical list (8.3)
- Hospital images in swipeable carousel (8.4)
- Operating hours in collapsible section (8.6)
- Tapping department scrolls to doctor section (8.7)

**Admin Panel Examples**:
- Data tables display as cards on mobile (9.2)
- Forms use single-column layout with section headers (9.3)
- File upload inputs support camera capture (accept="image/*" capture="environment") (9.5)
- Confirmation dialogs display as full-screen modals (9.6)
- Charts and metrics stack vertically (9.7)

**Authentication Examples**:
- Login form centered vertically on screen (10.3)
- Password fields have show/hide toggle button (10.5)
- Error messages display as toast or inline (10.6)
- Remember Me checkbox has 44x44px touch target (10.7)

**Content Prioritization Examples**:
- Search interface above the fold on home page (14.1)
- Less critical sections hidden/collapsed on mobile (14.2)
- Booking options prominent near top of doctor profiles (14.3)
- Progressive disclosure (show more/less) for lengthy content (14.4)
- Jump to section navigation available (14.5)
- Category tiles in 2-column grid on mobile (14.7)

**Error Handling Examples**:
- Network errors show mobile-friendly message with retry button (15.1)
- Loading states show skeleton screens or spinners (15.2)
- Form submission errors show in toast or banner (15.3)
- Success confirmations show visual feedback (checkmark, green banner) (15.4)
- Offline indicator displays when navigator.onLine is false (15.5)

**PWA Examples**:
- Manifest.json linked in document head (17.2)



## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples and edge cases (see Example-Based Tests above)
- Component rendering at different viewport sizes
- Integration between mobile components
- Error boundary behavior
- Specific UI interactions (menu opening, modal dismissal)

**Property-Based Tests** focus on:
- Universal properties that hold across all inputs (see Properties 1-47 above)
- Randomized viewport dimensions, text lengths, list sizes
- Touch gesture variations (swipe distances, speeds, angles)
- Performance characteristics across different network conditions

### Property-Based Testing Configuration

**Library**: fast-check (already in dependencies)

**Configuration**:
```typescript
import fc from 'fast-check';

// Minimum 100 iterations per property test
const propertyTestConfig = {
  numRuns: 100,
  verbose: true,
  seed: Date.now(), // For reproducibility
};

// Example property test
describe('Mobile View Enhancement Properties', () => {
  it('Property 1: Touch Target Minimum Size', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom('button', 'link', 'input', 'checkbox'),
          content: fc.string({ minLength: 1, maxLength: 50 }),
          viewport: fc.integer({ min: 320, max: 767 }),
        }),
        (config) => {
          // Feature: mobile-view-enhancement, Property 1: For any interactive element on mobile devices, the computed width and height SHALL both be at least 44 pixels
          
          const { container } = render(
            <InteractiveElement type={config.type} viewport={config.viewport}>
              {config.content}
            </InteractiveElement>
          );
          
          const element = container.firstChild as HTMLElement;
          const styles = window.getComputedStyle(element);
          const width = parseFloat(styles.width);
          const height = parseFloat(styles.height);
          
          return width >= 44 && height >= 44;
        }
      ),
      propertyTestConfig
    );
  });
  
  it('Property 7: No Horizontal Scroll', () => {
    fc.assert(
      fc.property(
        fc.record({
          viewport: fc.integer({ min: 320, max: 767 }),
          contentLength: fc.integer({ min: 100, max: 10000 }),
        }),
        (config) => {
          // Feature: mobile-view-enhancement, Property 7: For any page rendered at mobile viewport widths, the document.body.scrollWidth SHALL NOT exceed window.innerWidth
          
          window.innerWidth = config.viewport;
          const { container } = render(
            <MobilePage contentLength={config.contentLength} />
          );
          
          return document.body.scrollWidth <= window.innerWidth;
        }
      ),
      propertyTestConfig
    );
  });
  
  it('Property 19: First Contentful Paint Performance', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/doctors', '/hospitals', '/booking', '/'),
        async (route) => {
          // Feature: mobile-view-enhancement, Property 19: For any page load on simulated 3G network, FCP SHALL be less than 2000ms
          
          const metrics = await measurePerformance(route, {
            networkConditions: {
              downloadThroughput: 1.5 * 1024 * 1024 / 8,
              uploadThroughput: 750 * 1024 / 8,
              latency: 100,
            },
          });
          
          return metrics.fcp < 2000;
        }
      ),
      { ...propertyTestConfig, numRuns: 20 } // Fewer runs for expensive tests
    );
  });
  
  it('Property 28: Swipe Gesture Support', () => {
    fc.assert(
      fc.property(
        fc.record({
          startX: fc.integer({ min: 100, max: 300 }),
          distance: fc.integer({ min: 51, max: 200 }), // > 50px threshold
          duration: fc.integer({ min: 50, max: 500 }),
          direction: fc.constantFrom('left', 'right'),
        }),
        (gesture) => {
          // Feature: mobile-view-enhancement, Property 28: For any carousel, horizontal swipe gestures SHALL trigger navigation
          
          const { container } = render(<MobileCarousel items={mockItems} />);
          const carousel = container.firstChild as HTMLElement;
          
          const initialIndex = getCurrentCarouselIndex(carousel);
          
          simulateSwipe(carousel, {
            startX: gesture.startX,
            endX: gesture.startX + (gesture.direction === 'left' ? -gesture.distance : gesture.distance),
            duration: gesture.duration,
          });
          
          const newIndex = getCurrentCarouselIndex(carousel);
          
          // Should navigate to next/previous item
          return gesture.direction === 'left' 
            ? newIndex === initialIndex + 1 
            : newIndex === initialIndex - 1;
        }
      ),
      propertyTestConfig
    );
  });
});
```

### Test Tag Format

Each property test MUST include a comment tag referencing the design document:

```typescript
// Feature: mobile-view-enhancement, Property {number}: {property_text}
```

Example:
```typescript
// Feature: mobile-view-enhancement, Property 1: For any interactive element on mobile devices, the computed width and height SHALL both be at least 44 pixels
```

### Unit Test Examples

```typescript
describe('MobileBottomNavigation', () => {
  it('contains exactly 4 navigation items', () => {
    const { getAllByRole } = render(<MobileBottomNavigation />);
    const links = getAllByRole('link');
    
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveTextContent('Doctors');
    expect(links[1]).toHaveTextContent('Hospitals');
    expect(links[2]).toHaveTextContent('Booking');
    expect(links[3]).toHaveTextContent('Search');
  });
  
  it('highlights active navigation item', () => {
    const { getByRole } = render(
      <MobileBottomNavigation currentPath="/doctors" />
    );
    
    const doctorsLink = getByRole('link', { name: /doctors/i });
    expect(doctorsLink).toHaveClass('text-blue-600'); // Active color
  });
  
  it('is fixed at bottom with proper z-index', () => {
    const { container } = render(<MobileBottomNavigation />);
    const nav = container.firstChild as HTMLElement;
    const styles = window.getComputedStyle(nav);
    
    expect(styles.position).toBe('fixed');
    expect(styles.bottom).toBe('0px');
    expect(parseInt(styles.zIndex)).toBeGreaterThanOrEqual(50);
  });
});

describe('MobileSearchInterface', () => {
  it('shows clear button when text is entered', () => {
    const { getByRole, queryByRole } = render(<MobileSearchInterface />);
    const input = getByRole('textbox');
    
    // Initially no clear button
    expect(queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    
    // Type text
    fireEvent.change(input, { target: { value: 'cardiology' } });
    
    // Clear button appears
    expect(queryByRole('button', { name: /clear/i })).toBeInTheDocument();
  });
  
  it('scrolls input to top when focused', () => {
    const { getByRole } = render(<MobileSearchInterface />);
    const input = getByRole('textbox');
    
    const scrollIntoViewMock = jest.fn();
    input.scrollIntoView = scrollIntoViewMock;
    
    fireEvent.focus(input);
    
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });
});

describe('MobileDoctorCard', () => {
  it('displays doctor information in vertical stack', () => {
    const { container } = render(<MobileDoctorCard doctor={mockDoctor} />);
    const infoContainer = container.querySelector('.doctor-info');
    const styles = window.getComputedStyle(infoContainer!);
    
    expect(styles.flexDirection).toBe('column');
  });
  
  it('displays action buttons in horizontal row', () => {
    const { container } = render(<MobileDoctorCard doctor={mockDoctor} />);
    const buttonContainer = container.querySelector('.action-buttons');
    const styles = window.getComputedStyle(buttonContainer!);
    
    expect(styles.flexDirection).toBe('row');
  });
  
  it('uses 1:1 aspect ratio for doctor image with max 80px width', () => {
    const { container } = render(<MobileDoctorCard doctor={mockDoctor} />);
    const image = container.querySelector('img');
    const styles = window.getComputedStyle(image!);
    
    expect(styles.aspectRatio).toBe('1 / 1');
    expect(parseFloat(styles.maxWidth)).toBeLessThanOrEqual(80);
  });
});

describe('BookAppointmentModal - Mobile', () => {
  beforeEach(() => {
    // Set mobile viewport
    window.innerWidth = 375;
  });
  
  it('displays as full-screen on mobile', () => {
    const { container } = render(
      <BookAppointmentModal 
        open={true} 
        onClose={jest.fn()} 
        doctor={mockDoctor} 
      />
    );
    
    const modal = container.querySelector('.modal');
    const styles = window.getComputedStyle(modal!);
    
    expect(styles.position).toBe('fixed');
    expect(styles.inset).toBe('0px');
  });
  
  it('uses native date and time pickers', () => {
    const { getByLabelText } = render(
      <BookAppointmentModal 
        open={true} 
        onClose={jest.fn()} 
        doctor={mockDoctor} 
      />
    );
    
    const dateInput = getByLabelText(/date/i);
    const timeInput = getByLabelText(/time/i);
    
    expect(dateInput).toHaveAttribute('type', 'date');
    expect(timeInput).toHaveAttribute('type', 'time');
  });
  
  it('has fixed bottom action bar with submit button', () => {
    const { getByRole, container } = render(
      <BookAppointmentModal 
        open={true} 
        onClose={jest.fn()} 
        doctor={mockDoctor} 
      />
    );
    
    const submitButton = getByRole('button', { name: /book|submit/i });
    const actionBar = submitButton.closest('.action-bar');
    const styles = window.getComputedStyle(actionBar!);
    
    expect(styles.position).toBe('fixed');
    expect(styles.bottom).toBe('0px');
  });
});
```

### Performance Testing

```typescript
describe('Mobile Performance', () => {
  it('achieves FCP < 2s on 3G network', async () => {
    const metrics = await measurePagePerformance('/', {
      networkConditions: {
        downloadThroughput: 1.5 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
        latency: 100,
      },
      device: 'mobile',
    });
    
    expect(metrics.fcp).toBeLessThan(2000);
  });
  
  it('lazy loads below-fold images', () => {
    const { container } = render(<HomePage />);
    const images = container.querySelectorAll('img');
    
    const belowFoldImages = Array.from(images).filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.top > window.innerHeight;
    });
    
    belowFoldImages.forEach(img => {
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });
  
  it('implements virtual scrolling for lists > 50 items', () => {
    const doctors = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Doctor ${i}`,
    }));
    
    const { container } = render(<MobileDoctorList doctors={doctors} />);
    
    // Should not render all 100 items
    const renderedCards = container.querySelectorAll('.doctor-card');
    expect(renderedCards.length).toBeLessThan(100);
    expect(renderedCards.length).toBeGreaterThan(0);
  });
  
  it('maintains Lighthouse score above 85', async () => {
    const score = await runLighthouseAudit('/', {
      formFactor: 'mobile',
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
      },
    });
    
    expect(score.performance).toBeGreaterThanOrEqual(85);
  });
});
```

### Accessibility Testing

```typescript
describe('Mobile Accessibility', () => {
  it('has no axe violations on mobile viewport', async () => {
    window.innerWidth = 375;
    const { container } = render(<HomePage />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });
  
  it('supports keyboard navigation through all interactive elements', () => {
    const { getAllByRole } = render(<MobileBottomNavigation />);
    const links = getAllByRole('link');
    
    links[0].focus();
    expect(links[0]).toHaveFocus();
    
    // Tab to next element
    userEvent.tab();
    expect(links[1]).toHaveFocus();
  });
  
  it('announces navigation changes to screen readers', () => {
    const { container } = render(<MobileBottomNavigation />);
    const announcement = container.querySelector('[role="status"][aria-live="polite"]');
    
    expect(announcement).toBeInTheDocument();
  });
  
  it('maintains 4.5:1 contrast ratio for all text', () => {
    const { container } = render(<HomePage />);
    const textElements = container.querySelectorAll('p, span, h1, h2, h3, button');
    
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      const ratio = calculateContrastRatio(color, backgroundColor);
      
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
  
  it('supports text scaling to 200% without overflow', () => {
    document.documentElement.style.fontSize = '32px'; // 200% of 16px
    
    const { container } = render(<HomePage />);
    
    expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    
    document.documentElement.style.fontSize = ''; // Reset
  });
});
```

### Gesture Testing

```typescript
describe('Mobile Gestures', () => {
  it('supports swipe left/right on carousel', () => {
    const { container } = render(<MobileCarousel items={mockItems} />);
    const carousel = container.firstChild as HTMLElement;
    
    const initialIndex = 0;
    
    // Swipe left
    fireEvent.touchStart(carousel, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchMove(carousel, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(carousel);
    
    // Should move to next item
    expect(getCurrentCarouselIndex(carousel)).toBe(1);
  });
  
  it('supports pull-to-refresh on list pages', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    const { container } = render(
      <MobileDoctorList doctors={mockDoctors} onRefresh={onRefresh} />
    );
    
    const list = container.firstChild as HTMLElement;
    list.scrollTop = 0;
    
    // Pull down
    fireEvent.touchStart(list, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchMove(list, {
      touches: [{ clientX: 100, clientY: 250 }], // 150px down
    });
    fireEvent.touchEnd(list);
    
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });
  
  it('supports swipe-down to dismiss modal', () => {
    const onClose = jest.fn();
    const { container } = render(
      <MobileModal isOpen={true} onClose={onClose}>
        <div>Modal Content</div>
      </MobileModal>
    );
    
    const modal = container.querySelector('.modal-content') as HTMLElement;
    
    // Swipe down
    fireEvent.touchStart(modal, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchMove(modal, {
      touches: [{ clientX: 100, clientY: 250 }], // 150px down
    });
    fireEvent.touchEnd(modal);
    
    expect(onClose).toHaveBeenCalled();
  });
  
  it('supports long-press for context menu', async () => {
    const onLongPress = jest.fn();
    const { container } = render(
      <MobileDoctorCard doctor={mockDoctor} onLongPress={onLongPress} />
    );
    
    const card = container.firstChild as HTMLElement;
    
    fireEvent.touchStart(card);
    
    // Wait for long-press threshold (500ms)
    await new Promise(resolve => setTimeout(resolve, 600));
    
    fireEvent.touchEnd(card);
    
    expect(onLongPress).toHaveBeenCalled();
  });
});
```

### Device Testing Matrix

**Required Test Devices**:

| Device | Screen Width | Browser | Priority |
|--------|--------------|---------|----------|
| iPhone SE | 320px | Safari | High |
| iPhone 12/13 | 390px | Safari | High |
| iPhone 14 Pro Max | 430px | Safari | Medium |
| Samsung Galaxy S21 | 360px | Chrome Mobile | High |
| Google Pixel 6 | 412px | Chrome Mobile | High |
| iPad Mini | 768px | Safari | Medium |
| Samsung Galaxy Tab | 768px | Samsung Internet | Low |

**Testing Tools**:
- Chrome DevTools Device Mode (daily development)
- BrowserStack (weekly regression testing)
- Lighthouse CI (automated performance testing)
- axe DevTools (automated accessibility testing)

### Continuous Integration

```yaml
# .github/workflows/mobile-tests.yml
name: Mobile Tests

on: [push, pull_request]

jobs:
  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Run property-based tests
        run: npm test -- --testNamePattern="Property"
      
      - name: Run Lighthouse CI
        run: |
          npm run build
          npm run lighthouse:mobile
      
      - name: Run accessibility tests
        run: npm run test:a11y
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% line coverage
- **Property Test Coverage**: All 47 properties implemented
- **Example Test Coverage**: All example scenarios tested
- **Accessibility**: Zero axe violations
- **Performance**: Lighthouse score ≥ 85 on all pages

