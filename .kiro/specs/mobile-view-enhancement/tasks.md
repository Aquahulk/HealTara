# Implementation Plan: Mobile View Enhancement

## Overview

This implementation plan transforms the Healtara healthcare application into a mobile-first responsive experience. The application is built with Next.js 15, React 19, and Tailwind CSS 4. We'll implement 10 new mobile-optimized components, 5 custom hooks, mobile utilities, performance optimizations, and PWA support. The implementation follows a bottom-up approach, building foundational utilities and hooks first, then components, and finally integrating everything into the existing pages.

## Tasks

- [x] 1. Set up mobile infrastructure and utilities
  - Create mobile utility library with device detection, viewport utilities, touch utilities, and performance helpers
  - Create Tailwind CSS configuration extensions for mobile-specific utilities (touch targets, safe areas, momentum scrolling)
  - Set up mobile testing infrastructure with fast-check configuration
  - _Requirements: 1.1, 1.3, 2.1, 2.6_

- [ ] 2. Implement core mobile hooks
  - [x] 2.1 Create useViewport hook for reactive viewport information
    - Implement viewport dimension tracking with resize and orientation change listeners
    - Return viewport info including width, height, device type (mobile/tablet/desktop), orientation, and safe area insets
    - _Requirements: 1.1, 1.3_
  
  - [ ]* 2.2 Write property test for useViewport hook
    - **Property 2: Mobile Single-Column Layout**
    - **Validates: Requirements 4.1, 5.1, 6.2, 8.1, 9.3, 10.1**
  
  - [x] 2.3 Create useTouchGesture hook for gesture detection
    - Implement swipe detection (left, right, up, down) with configurable thresholds
    - Implement long-press detection (500ms threshold)
    - Implement pinch-to-zoom detection
    - Return gesture event handlers and current gesture state
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.7_
  
  - [ ]* 2.4 Write property test for useTouchGesture hook
    - **Property 28: Swipe Gesture Support**
    - **Validates: Requirements 13.1**
  
  - [x] 2.5 Create useMobileKeyboard hook for keyboard state detection
    - Detect keyboard open/close state using viewport height changes
    - Calculate keyboard height
    - Implement scrollToInput function for auto-scrolling to focused inputs
    - _Requirements: 6.5, 15.7_
  
  - [x] 2.6 Create useMobilePerformance hook for performance monitoring
    - Track FCP, LCP, FID, CLS, TTFB metrics using Performance API
    - Detect network type and device capabilities
    - Implement reportMetric function for custom metrics
    - _Requirements: 11.1, 18.4_
  
  - [ ]* 2.7 Write property test for useMobilePerformance hook
    - **Property 19: First Contentful Paint Performance**
    - **Validates: Requirements 11.1**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create MobileContext for global mobile state
  - Implement MobileProvider component with viewport tracking, bottom nav visibility state, hamburger menu state, and performance metrics
  - Create useMobile hook for consuming mobile context
  - Wrap application root with MobileProvider in apps/web/app/layout.tsx
  - _Requirements: 1.3, 3.1, 3.5_

- [ ] 5. Implement foundational mobile components
  - [x] 5.1 Create TouchFeedback component
    - Implement visual feedback (scale, opacity) on touch
    - Add haptic feedback using Vibration API
    - Implement debounce protection (300ms default)
    - Add ripple effect animation
    - _Requirements: 2.3, 2.4, 15.6_
  
  - [ ]* 5.2 Write property test for TouchFeedback component
    - **Property 10: Touch Feedback Timing**
    - **Property 11: Double-Tap Prevention**
    - **Validates: Requirements 2.3, 2.4**
  
  - [x] 5.3 Create MobileLayout component
    - Implement responsive padding management (16px minimum on mobile)
    - Add bottom navigation spacing (64px bottom padding)
    - Handle safe area insets for iOS notch support
    - Implement scroll restoration
    - Calculate viewport height accounting for mobile browser chrome
    - _Requirements: 1.5, 3.7_
  
  - [ ]* 5.4 Write property test for MobileLayout component
    - **Property 7: No Horizontal Scroll**
    - **Property 8: Responsive Padding**
    - **Validates: Requirements 1.2, 1.5**
  
  - [x] 5.5 Create MobileGestureHandler component
    - Implement swipe detection wrapper (left, right, up, down)
    - Add pull-to-refresh functionality
    - Add long-press detection
    - Add pinch-to-zoom support
    - Enable momentum scrolling
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.7_
  
  - [ ]* 5.6 Write property tests for MobileGestureHandler component
    - **Property 29: Pull-to-Refresh Gesture**
    - **Property 32: Momentum Scrolling**
    - **Property 34: Long-Press Context Menu**
    - **Validates: Requirements 13.2, 13.5, 13.7**

- [ ] 6. Implement mobile navigation components
  - [x] 6.1 Enhance MobileBottomNavigation component
    - Add active state highlighting with visual feedback
    - Ensure touch-optimized sizing (minimum 44x44px touch targets)
    - Add smooth transitions and animations
    - Add accessibility labels and ARIA attributes
    - Ensure fixed positioning with proper z-index management
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 6.2 Write property tests for MobileBottomNavigation
    - **Property 1: Touch Target Minimum Size**
    - **Property 14: Bottom Navigation Visibility**
    - **Property 15: Active Navigation Highlighting**
    - **Validates: Requirements 2.1, 3.1, 3.2, 3.4**
  
  - [ ]* 6.3 Write unit tests for MobileBottomNavigation
    - Test that navigation contains exactly 4 items (Doctors, Hospitals, Booking, Search)
    - Test active state highlighting based on currentPath prop
    - Test fixed positioning at bottom with proper z-index
    - _Requirements: 3.3_
  
  - [x] 6.4 Create MobileHeader component
    - Implement maximum 64px height on mobile
    - Add hamburger menu toggle button
    - Add collapsible user menu
    - Implement optional scroll-to-hide behavior
    - Ensure sticky positioning
    - _Requirements: 7.1, 7.2, 7.5, 7.6, 7.7_
  
  - [ ]* 6.5 Write unit tests for MobileHeader
    - Test maximum 64px height on mobile viewport
    - Test hamburger menu visibility and toggle functionality
    - Test user menu collapse on mobile
    - Test scroll-to-hide behavior when enabled
    - _Requirements: 7.1, 7.2, 7.6, 7.7_

- [~] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement mobile search and filtering
  - [~] 8.1 Create MobileSearchInterface component
    - Implement single-column layout
    - Set minimum 48px input height
    - Create collapsible filter accordion
    - Implement mobile-optimized dropdown (max viewport height)
    - Add clear button (X icon) that appears when text is entered
    - Implement auto-scroll on focus
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_
  
  - [ ]* 8.2 Write property tests for MobileSearchInterface
    - **Property 3: Mobile Input Height**
    - **Property 18: Keyboard Type Optimization**
    - **Validates: Requirements 4.2, 10.2**
  
  - [ ]* 8.3 Write unit tests for MobileSearchInterface
    - Test single-column layout on mobile
    - Test clear button appears when text is entered
    - Test filter accordion collapse/expand
    - Test auto-scroll to top when input is focused
    - Test search results display in single-column list
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.7_

- [ ] 9. Implement mobile card components
  - [~] 9.1 Create MobileDoctorCard component
    - Implement single-column layout
    - Use 1:1 aspect ratio image (max 80px)
    - Create vertical information stack with clear hierarchy
    - Add horizontal action buttons (44px height minimum)
    - Implement text truncation with ellipsis
    - Add touch feedback animations
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ]* 9.2 Write property tests for MobileDoctorCard
    - **Property 1: Touch Target Minimum Size**
    - **Property 9: Image Containment**
    - **Property 16: Text Truncation**
    - **Validates: Requirements 2.1, 1.6, 5.6**
  
  - [ ]* 9.3 Write unit tests for MobileDoctorCard
    - Test single-column layout with vertical information stack
    - Test action buttons in horizontal row at bottom
    - Test 1:1 aspect ratio image with max 80px width
    - Test text truncation for long names and descriptions
    - _Requirements: 5.1, 5.2, 5.4, 5.6, 5.7_
  
  - [~] 9.4 Create MobileHospitalCard component
    - Implement single-column layout
    - Add horizontal scrollable department filters
    - Create swipeable image carousel
    - Make phone/address links tappable (tel:, geo: protocols)
    - Add collapsible sections (hours, departments)
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_
  
  - [ ]* 9.5 Write property tests for MobileHospitalCard
    - **Property 6: Tappable Contact Links**
    - **Validates: Requirements 8.5, 17.3, 17.5**
  
  - [ ]* 9.6 Write unit tests for MobileHospitalCard
    - Test single-column layout
    - Test horizontal scrollable department filters
    - Test swipeable image carousel
    - Test tappable phone and address links
    - Test collapsible sections for hours and departments
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

- [ ] 10. Implement mobile modal and dialog components
  - [~] 10.1 Create MobileModal component
    - Implement full-screen overlay on mobile (< 768px)
    - Add swipe-down to dismiss gesture
    - Create fixed bottom action bar
    - Implement keyboard-aware positioning
    - Add smooth animations (slide up/down)
    - _Requirements: 6.1, 13.3_
  
  - [ ]* 10.2 Write property tests for MobileModal
    - **Property 30: Modal Swipe-to-Dismiss**
    - **Validates: Requirements 13.3**
  
  - [ ]* 10.3 Write unit tests for MobileModal
    - Test full-screen display on mobile viewport
    - Test swipe-down to dismiss functionality
    - Test fixed bottom action bar
    - Test keyboard-aware positioning
    - _Requirements: 6.1_
  
  - [~] 10.4 Enhance BookAppointmentModal for mobile
    - Make full-screen on mobile (< 768px)
    - Convert to single-column form layout
    - Use native date/time pickers (type="date", type="time")
    - Set minimum 48px input height
    - Add fixed bottom action bar with submit button
    - Implement keyboard-aware scrolling
    - Add inline error messages
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ]* 10.5 Write property tests for BookAppointmentModal
    - **Property 3: Mobile Input Height**
    - **Property 17: Form Error Placement**
    - **Property 46: Error Field Auto-Scroll**
    - **Validates: Requirements 6.4, 6.7, 15.7**
  
  - [ ]* 10.6 Write unit tests for BookAppointmentModal
    - Test full-screen display on mobile
    - Test single-column form layout
    - Test native date/time pickers
    - Test fixed bottom action bar
    - Test inline error messages
    - Test progress indicator for multi-step booking
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 6.8_

- [~] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement mobile-specific page enhancements
  - [x] 12.1 Enhance Home Page for mobile
    - Reduce hero section height to maximum 60vh on mobile
    - Set hero h1 font size to 24-32px on mobile
    - Ensure search interface is above the fold
    - Display category tiles in 2-column grid on mobile
    - Reduce number of featured items on mobile
    - _Requirements: 7.3, 7.4, 14.1, 14.7, 14.6_
  
  - [x] 12.2 Enhance Doctor Profile Page for mobile
    - Implement single-column layout for doctor information
    - Make booking options prominent near top
    - Ensure all interactive elements meet 44px minimum
    - Add progressive disclosure for lengthy content (show more/less)
    - _Requirements: 5.1, 14.3, 14.4, 2.1_
  
  - [x] 12.3 Enhance Hospital Page for mobile
    - Implement single-column layout
    - Add horizontal scrollable department filters
    - Display doctor roster in vertical list
    - Implement swipeable image carousel
    - Add collapsible sections for operating hours
    - Make tapping department scroll to doctor section
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_
  
  - [x] 12.4 Enhance Admin Panel for mobile
    - Convert data tables to card layout on mobile
    - Use single-column form layout with section headers
    - Add camera capture support for file uploads (accept="image/*" capture="environment")
    - Make confirmation dialogs full-screen modals on mobile
    - Stack charts and metrics vertically
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7_
  
  - [x] 12.5 Enhance Authentication Pages for mobile
    - Center login form vertically on screen
    - Set minimum 48px input height
    - Add show/hide toggle for password fields
    - Display error messages as toast or inline
    - Ensure Remember Me checkbox has 44px touch target
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [ ]* 12.6 Write property tests for page enhancements
    - **Property 4: Mobile Typography Minimums**
    - **Property 35: Content Item Count Reduction**
    - **Property 36: Line Height for Readability**
    - **Property 37: Mobile Type Scale**
    - **Validates: Requirements 2.5, 14.6, 16.1, 16.2, 16.3**

- [ ] 13. Implement performance optimizations
  - [~] 13.1 Implement image optimization strategy
    - Use Next.js Image component with mobile-optimized sizes
    - Add lazy loading for below-fold images
    - Generate responsive image variants (320w, 640w, 768w, 1024w)
    - Serve WebP with JPEG fallback
    - _Requirements: 1.6, 1.7, 11.2_
  
  - [ ]* 13.2 Write property test for image optimization
    - **Property 20: Lazy Loading Images**
    - **Validates: Requirements 11.2**
  
  - [~] 13.3 Implement code splitting and lazy loading
    - Add dynamic imports for mobile-only components
    - Implement route prefetching for likely next routes
    - Split mobile-specific bundles with conditional loading
    - _Requirements: 11.4_
  
  - [~] 13.4 Implement API response caching
    - Create mobile cache utility with 10-minute cache duration
    - Cache frequently accessed data (doctors list, hospitals list) in localStorage
    - Add timestamp-based cache invalidation
    - _Requirements: 11.6_
  
  - [ ]* 13.5 Write property test for API caching
    - **Property 23: API Response Caching**
    - **Validates: Requirements 11.6**
  
  - [~] 13.6 Implement virtual scrolling for large lists
    - Add @tanstack/react-virtual dependency
    - Implement virtual scrolling for lists exceeding 50 items
    - Configure overscan of 5 items
    - _Requirements: 11.3_
  
  - [ ]* 13.7 Write property test for virtual scrolling
    - **Property 21: Virtual Scrolling for Large Lists**
    - **Validates: Requirements 11.3**
  
  - [~] 13.8 Optimize animations for performance
    - Ensure all animations use only transform and opacity (GPU-accelerated)
    - Add will-change hints for animated elements
    - Implement reduced motion support
    - _Requirements: 11.5_
  
  - [ ]* 13.9 Write property test for animation performance
    - **Property 22: Animation Performance**
    - **Validates: Requirements 11.5**

- [~] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement mobile-specific features
  - [~] 15.1 Implement PWA configuration
    - Create manifest.json with app metadata, icons, and display settings
    - Add manifest link to document head
    - Generate PWA icons (192x192, 512x512)
    - Implement beforeinstallprompt handler for custom install prompt
    - _Requirements: 17.2_
  
  - [ ]* 15.2 Write unit test for PWA configuration
    - Test manifest.json is linked in document head
    - _Requirements: 17.2_
  
  - [~] 15.3 Implement native API integrations
    - Create getCurrentLocation function using Geolocation API
    - Create shareContent function using Web Share API with clipboard fallback
    - Create hapticFeedback function using Vibration API
    - Create authenticateWithBiometrics function using Web Authentication API
    - _Requirements: 17.1, 17.3, 17.4, 17.5, 17.6, 15.6_
  
  - [ ]* 15.4 Write property tests for native APIs
    - **Property 42: Geolocation API Usage**
    - **Property 43: Native Share API**
    - **Property 44: Biometric Authentication**
    - **Property 45: Haptic Feedback**
    - **Validates: Requirements 17.1, 17.4, 17.6, 15.6**
  
  - [~] 15.5 Implement offline handling
    - Create OfflineIndicator component that displays when navigator.onLine is false
    - Add online/offline event listeners
    - Display user-friendly offline message
    - _Requirements: 15.5_
  
  - [ ]* 15.6 Write unit test for offline handling
    - Test offline indicator displays when navigator.onLine is false
    - Test indicator hides when back online
    - _Requirements: 15.5_

- [ ] 16. Implement error handling and user feedback
  - [~] 16.1 Create MobileErrorBoundary component
    - Implement error boundary with mobile-friendly error UI
    - Add reload button for error recovery
    - Log errors to mobile analytics
    - _Requirements: 15.1_
  
  - [~] 16.2 Implement mobile error handling utilities
    - Create handleMobileNetworkError function for network-specific errors
    - Create showMobileFormError function with auto-scroll and haptic feedback
    - _Requirements: 15.1, 15.7_
  
  - [~] 16.3 Implement user feedback components
    - Create loading states with skeleton screens or spinners
    - Create success confirmations with visual feedback (checkmark, green banner)
    - Create error messages as toast or banner
    - _Requirements: 15.2, 15.3, 15.4_
  
  - [ ]* 16.4 Write unit tests for error handling
    - Test network error messages
    - Test form error display and auto-scroll
    - Test loading states
    - Test success confirmations
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.7_

- [ ] 17. Implement accessibility enhancements
  - [~] 17.1 Ensure all interactive elements meet accessibility requirements
    - Verify all interactive elements have minimum 44x44px touch targets
    - Add ARIA labels to all interactive elements without visible labels
    - Ensure all images have alt text
    - Add visible focus indicators (2px outline with contrasting color)
    - _Requirements: 12.1, 12.2, 12.4, 12.6, 12.7_
  
  - [ ]* 17.2 Write property tests for accessibility
    - **Property 5: Accessibility Attributes**
    - **Property 24: Keyboard Accessibility**
    - **Property 25: Color Contrast Ratio**
    - **Property 26: Visible Focus Indicator**
    - **Property 27: Text Scaling Support**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7**
  
  - [~] 17.3 Implement screen reader announcements
    - Create announceToScreenReader utility function
    - Add navigation change announcements
    - Add form submission announcements
    - Add error announcements
    - _Requirements: 12.8_
  
  - [ ]* 17.4 Write unit tests for screen reader announcements
    - Test navigation changes are announced
    - Test form submissions are announced
    - Test errors are announced
    - _Requirements: 12.8_

- [ ] 18. Implement typography and content enhancements
  - [~] 18.1 Apply mobile typography system
    - Set body text to minimum 16px on mobile
    - Set line-height to 1.5-1.7 for body text
    - Apply mobile type scale (h1: 24-32px, h2: 20-24px, h3: 18-20px)
    - Set paragraph spacing to minimum 16px
    - Use system fonts for performance
    - Apply tabular figures for numerical data
    - _Requirements: 16.1, 16.2, 16.3, 16.5, 16.6, 16.7_
  
  - [ ]* 18.2 Write property tests for typography
    - **Property 38: Line Length Limit**
    - **Property 39: Paragraph Spacing**
    - **Property 40: System Font Usage**
    - **Property 41: Tabular Figures for Numbers**
    - **Validates: Requirements 16.4, 16.5, 16.6, 16.7**
  
  - [~] 18.3 Implement content prioritization
    - Hide or collapse less critical sections on mobile
    - Add progressive disclosure (show more/less) for lengthy content
    - Add jump to section navigation
    - _Requirements: 14.2, 14.4, 14.5_

- [ ] 19. Final integration and testing
  - [~] 19.1 Integrate all mobile components into existing pages
    - Wrap all pages with MobileLayout component
    - Add MobileBottomNavigation to all pages on mobile
    - Add MobileHeader to all pages
    - Replace existing components with mobile-optimized versions on mobile viewports
    - _Requirements: 1.1, 3.1, 7.1_
  
  - [~] 19.2 Run comprehensive accessibility audit
    - Run axe DevTools on all pages at mobile viewport
    - Fix any accessibility violations
    - Verify keyboard navigation works on all pages
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_
  
  - [ ]* 19.3 Run Lighthouse performance audit
    - Run Lighthouse on all pages with mobile configuration
    - Ensure performance score ≥ 85 on all pages
    - Ensure FCP < 2s on simulated 3G network
    - _Requirements: 11.1, 18.4_
  
  - [ ]* 19.4 Write property test for Lighthouse score
    - **Property 47: Lighthouse Performance Score**
    - **Validates: Requirements 18.4**
  
  - [~] 19.5 Test on real devices
    - Test on iPhone SE (320px), iPhone 12/13 (390px), iPhone 14 Pro Max (430px)
    - Test on Samsung Galaxy S21 (360px), Google Pixel 6 (412px)
    - Test on iPad Mini (768px), Samsung Galaxy Tab (768px)
    - Verify all functionality works on Safari, Chrome Mobile, and Samsung Internet
    - _Requirements: 18.1, 18.2, 18.3_

- [~] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at reasonable breaks
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: utilities → hooks → components → pages
- All code uses TypeScript with React 19 and Next.js 15
- Mobile-first approach: base styles are for mobile, with progressive enhancement for larger screens
- Performance is critical: target FCP < 2s on 3G, Lighthouse score ≥ 85
- Accessibility is mandatory: WCAG 2.1 AA compliance, minimum 44px touch targets, proper ARIA labels
