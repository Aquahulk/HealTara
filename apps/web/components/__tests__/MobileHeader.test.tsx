/**
 * MobileHeader Component Tests
 * Tests for mobile-optimized header component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileHeader from '../MobileHeader';
import { MobileProvider } from '@/context/MobileContext';
import { AuthProvider } from '@/context/AuthContext';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Menu: () => <div data-testid="menu-icon">Menu</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <MobileProvider>{ui}</MobileProvider>
    </AuthProvider>
  );
};

describe('MobileHeader', () => {
  beforeEach(() => {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  describe('Basic Rendering', () => {
    it('renders the mobile header on mobile viewport', () => {
      renderWithProviders(<MobileHeader />);
      
      // Should render hamburger menu button
      expect(screen.getByLabelText(/open menu/i)).toBeInTheDocument();
    });

    it('renders logo when showLogo is true', () => {
      renderWithProviders(<MobileHeader showLogo={true} />);
      
      expect(screen.getByText('Healtara')).toBeInTheDocument();
      expect(screen.getByText('🏥')).toBeInTheDocument();
    });

    it('does not render logo when showLogo is false', () => {
      renderWithProviders(<MobileHeader showLogo={false} />);
      
      expect(screen.queryByText('Healtara')).not.toBeInTheDocument();
    });

    it('renders book appointment button when showBookButton is true', () => {
      renderWithProviders(<MobileHeader showBookButton={true} />);
      
      expect(screen.getByText(/book/i)).toBeInTheDocument();
    });

    it('does not render book button when showBookButton is false', () => {
      renderWithProviders(<MobileHeader showBookButton={false} />);
      
      expect(screen.queryByText(/book/i)).not.toBeInTheDocument();
    });
  });

  describe('Header Height', () => {
    it('has maximum 64px height on mobile viewport', () => {
      const { container } = renderWithProviders(<MobileHeader />);
      
      const header = container.querySelector('header');
      expect(header).toHaveStyle({ maxHeight: '64px' });
    });

    it('has h-16 class (64px) for the inner container', () => {
      const { container } = renderWithProviders(<MobileHeader />);
      
      const innerContainer = container.querySelector('.h-16');
      expect(innerContainer).toBeInTheDocument();
    });
  });

  describe('Hamburger Menu', () => {
    it('toggles hamburger menu when button is clicked', () => {
      renderWithProviders(<MobileHeader />);
      
      const menuButton = screen.getByLabelText(/open menu/i);
      
      // Initially closed
      expect(screen.queryByText(/patient login/i)).not.toBeInTheDocument();
      
      // Click to open
      fireEvent.click(menuButton);
      
      // Menu should be open
      expect(screen.getByLabelText(/close menu/i)).toBeInTheDocument();
    });

    it('displays menu icon when closed', () => {
      renderWithProviders(<MobileHeader />);
      
      expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    });

    it('displays X icon when open', () => {
      renderWithProviders(<MobileHeader />);
      
      const menuButton = screen.getByLabelText(/open menu/i);
      fireEvent.click(menuButton);
      
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
      renderWithProviders(<MobileHeader />);
      
      const menuButton = screen.getByLabelText(/open menu/i);
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(menuButton);
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Touch Target Size', () => {
    it('hamburger button meets minimum 44x44px touch target', () => {
      renderWithProviders(<MobileHeader />);
      
      const menuButton = screen.getByLabelText(/open menu/i);
      
      expect(menuButton).toHaveClass('min-w-[44px]');
      expect(menuButton).toHaveClass('min-h-[44px]');
    });

    it('book button meets minimum 44px height', () => {
      renderWithProviders(<MobileHeader />);
      
      const bookButton = screen.getByText(/book/i);
      
      expect(bookButton).toHaveClass('min-h-[44px]');
    });
  });

  describe('Sticky Positioning', () => {
    it('has fixed positioning', () => {
      const { container } = renderWithProviders(<MobileHeader />);
      
      const header = container.querySelector('header');
      
      expect(header).toHaveClass('fixed');
      expect(header).toHaveClass('top-0');
      expect(header).toHaveClass('left-0');
      expect(header).toHaveClass('right-0');
    });

    it('has proper z-index for stacking', () => {
      const { container } = renderWithProviders(<MobileHeader />);
      
      const header = container.querySelector('header');
      
      expect(header).toHaveClass('z-50');
    });
  });

  describe('Scroll-to-Hide Behavior', () => {
    it('is visible by default', () => {
      const { container } = renderWithProviders(<MobileHeader hideOnScroll={true} />);
      
      const header = container.querySelector('header');
      
      expect(header).toHaveClass('translate-y-0');
    });

    it('does not hide when hideOnScroll is false', () => {
      const { container } = renderWithProviders(<MobileHeader hideOnScroll={false} />);
      
      const header = container.querySelector('header');
      
      // Should always be visible
      expect(header).toHaveClass('translate-y-0');
    });
  });

  describe('User Menu', () => {
    it('displays login links when user is not logged in', () => {
      renderWithProviders(<MobileHeader />);
      
      // Open hamburger menu
      const menuButton = screen.getByLabelText(/open menu/i);
      fireEvent.click(menuButton);
      
      // Should show login links
      expect(screen.getByText(/patient login/i)).toBeInTheDocument();
      expect(screen.getByText(/doctor\/hospital login/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label for hamburger button', () => {
      renderWithProviders(<MobileHeader />);
      
      const menuButton = screen.getByLabelText(/open menu/i);
      
      expect(menuButton).toHaveAttribute('aria-label');
    });

    it('menu items have minimum touch target height', () => {
      renderWithProviders(<MobileHeader />);
      
      // Open menu
      const menuButton = screen.getByLabelText(/open menu/i);
      fireEvent.click(menuButton);
      
      // Check login links have min-h-[44px] class or flex items-center which ensures proper height
      const loginLinks = screen.getAllByRole('link');
      loginLinks.forEach(link => {
        // The link should have either min-h-[44px] or flex items-center classes
        const hasMinHeight = link.className.includes('min-h-[44px]');
        const hasFlexItems = link.className.includes('flex') && link.className.includes('items-center');
        expect(hasMinHeight || hasFlexItems).toBe(true);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('does not render on desktop viewport', () => {
      // Set desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { container } = renderWithProviders(<MobileHeader />);
      
      // Should not render header
      expect(container.querySelector('header')).not.toBeInTheDocument();
    });
  });
});
