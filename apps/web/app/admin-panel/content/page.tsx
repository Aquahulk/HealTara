"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

// ============================================================================
// 🎛️ ADMIN CONTENT MANAGEMENT PANEL
// ============================================================================
// This panel allows admins to manage all homepage content including:
// - Hero section text and images
// - Statistics and counters
// - Featured content
// - Testimonials
// - Call-to-action sections
// - Footer content
// ============================================================================

interface HomepageContent {
  hero: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    ctaText: string;
    backgroundImage?: string;
  };
  stats: {
    doctors: number;
    patients: number;
    cities: number;
    reviews: number;
  };
  features: Array<{
    id: string;
    icon: string;
    title: string;
    description: string;
    isActive: boolean;
  }>;
  testimonials: Array<{
    id: string;
    name: string;
    role: string;
    content: string;
    rating: number;
    isActive: boolean;
  }>;
  cta: {
    title: string;
    subtitle: string;
    doctorCta: string;
    hospitalCta: string;
  };
}

export default function ContentManagementPage() {
  const { user } = useAuth();
  const [content, setContent] = useState<HomepageContent>({
    hero: {
      title: "Find Trusted Doctors Near You",
      subtitle: "Book appointments in seconds with verified healthcare professionals",
      searchPlaceholder: "Search by doctor, specialty, or location",
      ctaText: "Find a Doctor Now"
    },
    stats: {
      doctors: 1250,
      patients: 50000,
      cities: 45,
      reviews: 12000
    },
    features: [
      {
        id: "1",
        icon: "🏥",
        title: "Hospitals",
        description: "Partner hospitals with full facilities",
        isActive: true
      },
      {
        id: "2",
        icon: "👨‍⚕️",
        title: "Single Doctors",
        description: "Individual practitioners and specialists",
        isActive: true
      },
      {
        id: "3",
        icon: "👩‍⚕️",
        title: "Multi-Doctor Clinics",
        description: "Comprehensive clinics with multiple specialists",
        isActive: true
      },
      {
        id: "4",
        icon: "💻",
        title: "Online Consultation",
        description: "Video consultations from anywhere",
        isActive: true
      },
      {
        id: "5",
        icon: "🧪",
        title: "Labs & Diagnostics",
        description: "Lab tests and diagnostic services",
        isActive: true
      }
    ],
    testimonials: [
      {
        id: "1",
        name: "Sarah Johnson",
        role: "Patient",
        content: "Found my perfect cardiologist in just 2 minutes. The booking process was so smooth!",
        rating: 5,
        isActive: true
      },
      {
        id: "2",
        name: "Dr. Michael Chen",
        role: "Cardiologist",
        content: "This platform has helped me reach more patients and manage my practice efficiently.",
        rating: 5,
        isActive: true
      },
      {
        id: "3",
        name: "Emma Wilson",
        role: "Patient",
        content: "The online consultation feature saved me during lockdown. Highly recommended!",
        rating: 5,
        isActive: true
      }
    ],
    cta: {
      title: "Join 200+ Verified Doctors Already Onboard!",
      subtitle: "Grow your practice with thousands of patients looking for quality healthcare",
      doctorCta: "Doctor Sign-up",
      hospitalCta: "Hospital Sign-up"
    }
  });

  const [activeTab, setActiveTab] = useState('hero');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Check if user is admin
  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      // Here you would save to your backend/database
      console.log('Saving content:', content);
      setMessage('Content saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving content');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updateContent = (section: string, field: string, value: any) => {
    setContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof HomepageContent],
        [field]: value
      }
    }));
  };

  const updateFeature = (id: string, field: string, value: any) => {
    setContent(prev => ({
      ...prev,
      features: prev.features.map(feature =>
        feature.id === id ? { ...feature, [field]: value } : feature
      )
    }));
  };

  const updateTestimonial = (id: string, field: string, value: any) => {
    setContent(prev => ({
      ...prev,
      testimonials: prev.testimonials.map(testimonial =>
        testimonial.id === id ? { ...testimonial, [field]: value } : testimonial
      )
    }));
  };

  const addFeature = () => {
    const newFeature = {
      id: Date.now().toString(),
      icon: "🏥",
      title: "New Feature",
      description: "Description here",
      isActive: true
    };
    setContent(prev => ({
      ...prev,
      features: [...prev.features, newFeature]
    }));
  };

  const addTestimonial = () => {
    const newTestimonial = {
      id: Date.now().toString(),
      name: "New User",
      role: "Patient",
      content: "Great experience!",
      rating: 5,
      isActive: true
    };
    setContent(prev => ({
      ...prev,
      testimonials: [...prev.testimonials, newTestimonial]
    }));
  };

  const deleteFeature = (id: string) => {
    setContent(prev => ({
      ...prev,
      features: prev.features.filter(feature => feature.id !== id)
    }));
  };

  const deleteTestimonial = (id: string) => {
    setContent(prev => ({
      ...prev,
      testimonials: prev.testimonials.filter(testimonial => testimonial.id !== id)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600">Manage your homepage content and settings</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'hero', name: 'Hero Section' },
              { id: 'stats', name: 'Statistics' },
              { id: 'features', name: 'Quick Categories' },
              { id: 'testimonials', name: 'Testimonials' },
              { id: 'cta', name: 'Call to Action' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Hero Section */}
        {activeTab === 'hero' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Hero Section</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Title
                </label>
                <input
                  type="text"
                  value={content.hero.title}
                  onChange={(e) => updateContent('hero', 'title', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtitle
                </label>
                <textarea
                  value={content.hero.subtitle}
                  onChange={(e) => updateContent('hero', 'subtitle', e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Placeholder
                </label>
                <input
                  type="text"
                  value={content.hero.searchPlaceholder}
                  onChange={(e) => updateContent('hero', 'searchPlaceholder', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  value={content.hero.ctaText}
                  onChange={(e) => updateContent('hero', 'ctaText', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doctors Count
                </label>
                <input
                  type="number"
                  value={content.stats.doctors}
                  onChange={(e) => updateContent('stats', 'doctors', parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patients Count
                </label>
                <input
                  type="number"
                  value={content.stats.patients}
                  onChange={(e) => updateContent('stats', 'patients', parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cities Count
                </label>
                <input
                  type="number"
                  value={content.stats.cities}
                  onChange={(e) => updateContent('stats', 'cities', parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reviews Count
                </label>
                <input
                  type="number"
                  value={content.stats.reviews}
                  onChange={(e) => updateContent('stats', 'reviews', parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        {activeTab === 'features' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Quick Categories</h2>
              <button
                onClick={addFeature}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Feature
              </button>
            </div>
            <div className="space-y-4">
              {content.features.map((feature) => (
                <div key={feature.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={feature.icon}
                        onChange={(e) => updateFeature(feature.id, 'icon', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={feature.title}
                        onChange={(e) => updateFeature(feature.id, 'title', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={feature.description}
                        onChange={(e) => updateFeature(feature.id, 'description', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-end space-x-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={feature.isActive}
                          onChange={(e) => updateFeature(feature.id, 'isActive', e.target.checked)}
                          className="mr-2"
                        />
                        Active
                      </label>
                      <button
                        onClick={() => deleteFeature(feature.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testimonials */}
        {activeTab === 'testimonials' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Testimonials</h2>
              <button
                onClick={addTestimonial}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Testimonial
              </button>
            </div>
            <div className="space-y-4">
              {content.testimonials.map((testimonial) => (
                <div key={testimonial.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={testimonial.name}
                        onChange={(e) => updateTestimonial(testimonial.id, 'name', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={testimonial.role}
                        onChange={(e) => updateTestimonial(testimonial.id, 'role', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating
                      </label>
                      <select
                        value={testimonial.rating}
                        onChange={(e) => updateTestimonial(testimonial.id, 'rating', parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={1}>1 Star</option>
                        <option value={2}>2 Stars</option>
                        <option value={3}>3 Stars</option>
                        <option value={4}>4 Stars</option>
                        <option value={5}>5 Stars</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content
                      </label>
                      <textarea
                        value={testimonial.content}
                        onChange={(e) => updateTestimonial(testimonial.id, 'content', e.target.value)}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-3 flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={testimonial.isActive}
                          onChange={(e) => updateTestimonial(testimonial.id, 'isActive', e.target.checked)}
                          className="mr-2"
                        />
                        Active
                      </label>
                      <button
                        onClick={() => deleteTestimonial(testimonial.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        {activeTab === 'cta' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Call to Action Section</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={content.cta.title}
                  onChange={(e) => updateContent('cta', 'title', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtitle
                </label>
                <textarea
                  value={content.cta.subtitle}
                  onChange={(e) => updateContent('cta', 'subtitle', e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doctor CTA Text
                  </label>
                  <input
                    type="text"
                    value={content.cta.doctorCta}
                    onChange={(e) => updateContent('cta', 'doctorCta', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hospital CTA Text
                  </label>
                  <input
                    type="text"
                    value={content.cta.hospitalCta}
                    onChange={(e) => updateContent('cta', 'hospitalCta', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
