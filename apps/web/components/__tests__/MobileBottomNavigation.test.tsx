/**
 * Unit tests for MobileBottomNavigation component
 * Tests active state highlighting, touch-optimized sizing, transitions,
 * accessibility labels, and fixed positioning
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileBottomNavigation from '../MobileBottomNavigation';

// Mock usePathname from next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/doctors'),
}));

describe('MobileBottomNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Navigation Items (Requirement 3.3)', () => {
    it('contains exactly 4 navigation items', () => {
      render(<MobileBottomNavigation />);
      const links = screen.getAllByRole('link');
      
      expect(links).toHaveLength(4);
    });

    it('displays correct labels for all navigation items', () => {
      render(<MobileBottomNavigation />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Doctors')).toBeInTheDocument();
      expect(screen.getByText('Hospitals')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('has correct href attributes for all navigation items', () => {
      render(<MobileBottomNavigation />);
      
      const homeLink = screen.getByRole('link', { name: /navigate to home page/i });
      const doctorsLink = screen.getByRole('link', { name: /navigate to doctors page/i });
      const hospitalsLink = screen.getByRole('link', { name: /navigate to hospitals page/i });
      const searchLink = screen.getByRole('link', { name: /navigate to search page/i });
      
      expect(homeLink).toHaveAttribute('href', '/');
      expect(doctorsLink).toHaveAttribute('href', '/doctors');
      expect(hospitalsLink).toHaveAttribute('href', '/hospitals');
      expect(searchLink).toHaveAttribute('href', '/search');
    });
  });

  describe('Active State Highlighting (Requirement 3.4)', () => {
    it('highlights active navigation item based on usePathname', () => {
      const usePathname = require('next/navigation').usePathname;
      usePathname.mockReturnValue('/doctors');
      
      render(<MobileBottomNavigation />);
      
      const doctorsLink = screen.getByRole('link', { name: /navigate to doctors page/i });
      expect(doctorsLink).toHaveClass('text-blue-600', 'bg-blue-50');
      expect(doctorsLink).toHaveAttribute('aria-current', 'page');
    });

    it('highlights active navigation item based on currentPath prop', () => {
      render(<MobileBottomNavigation currentPath="/hospitals" />);
      
      const hospitalsLink = screen.getByRole('link', { name: /navigate to hospitals page/i });
      expect(hospitalsLink).toHaveClass('text-blue-600', 'bg-blue-50');
      expect(hospitalsLink).toHaveAttribute('aria-current', 'page');
    });

    it('does not highlight inactive navigation items', () => {
      const usePathname = require('next/navigation').usePathname;
      usePathname.mockReturnValue('/doctors');
      
      render(<MobileBottomNavigation />);
      
      const hospitalsLink = screen.getByRole('link', { name: /navigate to hospitals page/i });
      expect(hospitalsLink).toHaveClass('text-gray-600');
      expect(hospitalsLink).not.toHaveAttribute('aria-current');
    });

    it('highlights item when on a sub-route', () => {
      const usePathname = require('next/navigation').usePathname;
      usePathname.mockReturnValue('/doctors/123');
      
      render(<MobileBottomNavigation />);
      
      const doctorsLink = screen.getByRole('link', { name: /navigate to doctors page/i });
      expect(doctorsLink).toHaveClass('text-blue-600', 'bg-blue-50');
      expect(doctorsLink).toHaveAttribute('aria-current', 'page');
    });

    it('applies scale-110 transform to active icon', () => {
      const usePathname = require('next/navigation').usePathname;
      usePathname.mockReturnValue('/doctors');
      
      const { container } = render(<MobileBottomNavigation />);
      
      const doctorsLink = screen.getByRole('link', { name: /navigate to doctors page/i });
      const icon = doctorsLink.querySelector('svg');
      
      expect(icon).toHaveClass('scale-110');
    });

    it('applies font-semibold to active label', () => {
      const usePathname = require('next/navigation').usePathname;
      usePathname.mockReturnValue('/doctors');
      
      render(<MobileBottomNavigation />);
      
      const doctorsLink = screen.getByRole('link', { name: /navigate to doctors page/i });
      const label = doctorsLink.querySelector('span');
      
      expect(label).toHaveClass('font-semibold');
    });
  });

  describe('Touch-Optimized Sizing (Requirement 2.1)', () => {
    it('ensures all navigation items have minimum 44x44px touch targets', () => {
      const { container } = render(<MobileBottomNavigation />);
      const links = container.querySelectorAll('a');
      
      links.forEach(link => {
        expect(link).toHaveClass('min-h-[44px]', 'min-w-[44px]');
      });
    });
  });

  describe('Smooth Transitions and Animations', () => {
    it('applies transition classes to navigation items', () => {
      const { container } = render(<MobileBottomNavigation />);
      const links = container.querySelectorAll('a');
      
      links.forEach(link => {
        expect(link).toHaveClass('transition-all', 'duration-200', 'ease-in-out');
      });
    });

    it('applies active state animations', () => {
      const { container } = render(<MobileBottomNavigation />);
      const links = container.querySelectorAll('a');
      
      links.forEach(link => {
        expect(link).toHaveClass('active:scale-95', 'active:opacity-80');
      });
    });

    it('applies transition to icons', () => {
      const { container } = render(<MobileBottomNavigation />);
      const icons = container.querySelectorAll('svg');
      
      icons.forEach(icon => {
        expect(icon).toHaveClass('transition-transform', 'duration-200');
      });
    });
  });

  describe('Accessibility (Requirements 12.2, 12.6, 12.7)', () => {
    it('has proper navigation role and aria-label', () => {
      const { container } = render(<MobileBottomNavigation />);
      const nav = container.querySelector('nav');
      
      expect(nav).toHaveAttribute('role', 'navigation');
      expect(nav).toHaveAttribute('aria-label', 'Mobile bottom navigation');
    });

    it('has aria-label for each navigation item', () => {
      render(<MobileBottomNavigation />);
      
      expect(screen.getByRole('link', { name: /navigate to home page/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to doctors page/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to hospitals page/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to search page/i })).toBeInTheDocument();
    });

    it('sets aria-current="page" for active navigation item', () => {
      const usePathname = require('next/navigation').usePathname;
      usePathname.mockReturnValue('/doctors');
      
      render(<MobileBottomNavigation />);
      
      const doctorsLink = screen.getByRole('link', { name: /navigate to doctors page/i });
      expect(doctorsLink).toHaveAttribute('aria-current', 'page');
    });

    it('sets aria-hidden="true" on icons', () => {
      const { container } = render(<MobileBottomNavigation />);
      const icons = container.querySelectorAll('svg');
      
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('has tabIndex={0} for keyboard navigation', () => {
      const { container } = render(<MobileBottomNavigation />);
      const links = container.querySelectorAll('a');
      
      links.forEach(link => {
        expect(link).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Fixed Positioning (Requirements 3.1, 3.2)', () => {
    it('has fixed positioning at bottom', () => {
      const { container } = render(<MobileBottomNavigation />);
      const nav = container.querySelector('nav');
      
      expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0');
    });

    it('has proper z-index for layering', () => {
      const { container } = render(<MobileBottomNavigation />);
      const nav = container.querySelector('nav');
      
      expect(nav).toHaveClass('z-50');
    });

    it('is hidden on desktop (md breakpoint and above)', () => {
      const { container } = render(<MobileBottomNavigation />);
      const nav = container.querySelector('nav');
      
      expect(nav).toHaveClass('md:hidden');
    });

    it('has proper styling (background, border, shadow)', () => {
      const { container } = render(<MobileBottomNavigation />);
      const nav = container.querySelector('nav');
      
      expect(nav).toHaveClass('bg-white', 'border-t', 'border-gray-200', 'shadow-lg');
    });

    it('has height of 64px (h-16)', () => {
      const { container } = render(<MobileBottomNavigation />);
      const navContent = container.querySelector('.grid');
      
      expect(navContent).toHaveClass('h-16');
    });
  });

  describe('Custom className', () => {
    it('applies custom className to navigation', () => {
      const { container } = render(<MobileBottomNavigation className="custom-class" />);
      const nav = container.querySelector('nav');
      
      expect(nav).toHaveClass('custom-class');
    });
  });

  describe('Hover States', () => {
    it('applies hover styles to inactive items', () => {
      const usePathname = require('next/navigation').usePathname;
      usePathname.mockReturnValue('/doctors');
      
      const { container } = render(<MobileBottomNavigation />);
      
      const hospitalsLink = screen.getByRole('link', { name: /navigate to hospitals page/i });
      expect(hospitalsLink).toHaveClass('hover:text-blue-600', 'hover:bg-gray-50');
    });
  });

  describe('Grid Layout', () => {
    it('uses 4-column grid layout', () => {
      const { container } = render(<MobileBottomNavigation />);
      const grid = container.querySelector('.grid');
      
      expect(grid).toHaveClass('grid-cols-4');
    });
  });
});
