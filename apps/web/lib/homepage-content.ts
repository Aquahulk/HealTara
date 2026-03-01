// ============================================================================
// 🏠 HOMEPAGE CONTENT STORE - Centralized content management
// ============================================================================
// This file manages homepage content that can be edited by admins
// Content is stored in localStorage and used by both admin panel and homepage

export interface HomepageContent {
  hero: {
    slides: Array<{
      title: string;
      subtitle: string;
      description: string;
      gradient: string;
      icon: string;
      showSteps: boolean;
    }>;
  };
  trustedBy: {
    title: string;
    subtitle: string;
    stats: {
      doctors: number;
      patients: number;
      cities: number;
      reviews: number;
    };
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: Array<{
      step: number;
      title: string;
      description: string;
      icon: string;
    }>;
  };
  whyChooseUs: {
    title: string;
    subtitle: string;
    features: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
  };
  testimonials: {
    title: string;
    subtitle: string;
    reviews: Array<{
      name: string;
      role: string;
      content: string;
      rating: number;
      avatar: string;
    }>;
  };
  healthTips: {
    title: string;
    subtitle: string;
    tips: Array<{
      title: string;
      description: string;
      icon: string;
      category: string;
    }>;
  };
}

// Default homepage content
export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  hero: {
    slides: [
      {
        title: "Your Health, Our Priority",
        subtitle: "Connect with verified doctors instantly",
        description: "Book appointments in 60 seconds",
        gradient: "from-blue-600 via-purple-600 to-pink-500",
        icon: "Heart",
        showSteps: false
      },
      {
        title: "How to Book an Appointment",
        subtitle: "Simple 3-step process",
        description: "Get started in minutes",
        gradient: "from-green-500 via-teal-500 to-blue-500",
        icon: "CheckCircle",
        showSteps: true
      },
      {
        title: "Book Appointments Easily",
        subtitle: "24/7 online booking",
        description: "Schedule anytime, anywhere",
        gradient: "from-purple-600 via-pink-500 to-red-500",
        icon: "Calendar",
        showSteps: false
      },
      {
        title: "Trusted Healthcare Network",
        subtitle: "Verified doctors & hospitals",
        description: "1000+ healthcare professionals",
        gradient: "from-orange-500 via-red-500 to-pink-600",
        icon: "Shield",
        showSteps: false
      },
      {
        title: "Quality Healthcare Services",
        subtitle: "Comprehensive medical care",
        description: "From consultations to treatments",
        gradient: "from-indigo-600 via-purple-500 to-pink-500",
        icon: "Stethoscope",
        showSteps: false
      }
    ]
  },
  trustedBy: {
    title: "Trusted by Thousands",
    subtitle: "Join our growing community of healthcare providers and satisfied patients",
    stats: {
      doctors: 2500,
      patients: 100000,
      cities: 75,
      reviews: 10000
    }
  },
  howItWorks: {
    title: "How It Works",
    subtitle: "Get started in 3 simple steps",
    steps: [
      {
        step: 1,
        title: "Search",
        description: "Find the right doctor/clinic",
        icon: "Search"
      },
      {
        step: 2,
        title: "Book",
        description: "Select time & pay booking fee",
        icon: "Calendar"
      },
      {
        step: 3,
        title: "Visit",
        description: "Confirmed appointment + rating system",
        icon: "CheckCircle"
      }
    ]
  },
  whyChooseUs: {
    title: "Why Choose Us",
    subtitle: "Experience healthcare reimagined for the digital age",
    features: [
      {
        title: "Verified Doctors",
        description: "All doctors verified by license ID",
        icon: "Shield"
      },
      {
        title: "Transparent Reviews",
        description: "1 booking = 1 review system",
        icon: "MessageCircle"
      },
      {
        title: "Multi-language Support",
        description: "Available in multiple languages",
        icon: "Globe"
      },
      {
        title: "One-stop Healthcare",
        description: "Doctors, clinics, hospitals, labs, insurance",
        icon: "Building2"
      }
    ]
  },
  testimonials: {
    title: "What Our Users Say",
    subtitle: "Real stories from real people",
    reviews: [
      {
        name: "Sarah Johnson",
        role: "Patient",
        content: "Found my perfect cardiologist within minutes. The booking process was seamless!",
        rating: 5,
        avatar: "👩‍💼"
      },
      {
        name: "Dr. Michael Chen",
        role: "Cardiologist",
        content: "This platform has increased my patient base by 40%. Highly recommended!",
        rating: 5,
        avatar: "👨‍⚕️"
      },
      {
        name: "Priya Sharma",
        role: "Patient",
        content: "The online consultation feature saved me during lockdown. Amazing service!",
        rating: 5,
        avatar: "👩‍🎓"
      }
    ]
  },
  healthTips: {
    title: "Health Tips from Our Doctors",
    subtitle: "Expert advice and health awareness articles",
    tips: [
      {
        title: "Dengue Prevention Tips",
        description: "Essential precautions to protect yourself from dengue fever",
        icon: "Shield",
        category: "Preventive Care"
      },
      {
        title: "Diabetes Management Guide",
        description: "Comprehensive guide to managing diabetes effectively",
        icon: "Activity",
        category: "Chronic Conditions"
      },
      {
        title: "Mental Health Awareness",
        description: "Understanding and supporting mental health in daily life",
        icon: "Heart",
        category: "Mental Health"
      }
    ]
  }
};

const STORAGE_KEY = 'homepage_content_v1';

// Get homepage content (from localStorage or default)
export function getHomepageContent(): HomepageContent {
  if (typeof window === 'undefined') {
    return DEFAULT_HOMEPAGE_CONTENT;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate structure
      if (parsed && parsed.hero && parsed.trustedBy && parsed.howItWorks && 
          parsed.whyChooseUs && parsed.testimonials && parsed.healthTips) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading homepage content:', error);
  }

  return DEFAULT_HOMEPAGE_CONTENT;
}

// Save homepage content to localStorage
export function saveHomepageContent(content: HomepageContent): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    // Trigger a custom event to notify homepage to reload
    window.dispatchEvent(new CustomEvent('homepage-content-updated', { detail: content }));
    return true;
  } catch (error) {
    console.error('Error saving homepage content:', error);
    return false;
  }
}

// Reset to default content
export function resetHomepageContent(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('homepage-content-updated', { detail: DEFAULT_HOMEPAGE_CONTENT }));
    return true;
  } catch (error) {
    console.error('Error resetting homepage content:', error);
    return false;
  }
}
