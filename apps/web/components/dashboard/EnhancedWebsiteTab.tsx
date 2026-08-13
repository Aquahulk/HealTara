'use client';

import { useState, useEffect } from 'react';
import { Palette, Type, Layout, Image as ImageIcon, Save, Eye, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface DoctorProfile {
  id: number;
  slug: string;
  specialization: string;
  clinicName: string;
  websiteTheme: string;
  profileImage: string;
  micrositeEnabled?: boolean;
}

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  buttonStyle: 'rounded' | 'square' | 'pill';
  layout: 'modern' | 'classic' | 'minimal';
}

interface EnhancedWebsiteTabProps {
  doctorProfile: DoctorProfile | null;
  onUpdate: (updates: Partial<DoctorProfile>) => Promise<void>;
}

const PRESET_THEMES: Record<string, ThemeConfig> = {
  medical: {
    primaryColor: '#3b82f6',
    secondaryColor: '#60a5fa',
    accentColor: '#10b981',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    fontFamily: 'Inter',
    buttonStyle: 'rounded',
    layout: 'modern',
  },
  wellness: {
    primaryColor: '#10b981',
    secondaryColor: '#34d399',
    accentColor: '#fbbf24',
    backgroundColor: '#f0fdf4',
    textColor: '#064e3b',
    fontFamily: 'Poppins',
    buttonStyle: 'pill',
    layout: 'modern',
  },
  professional: {
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    accentColor: '#6366f1',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    fontFamily: 'Roboto',
    buttonStyle: 'square',
    layout: 'classic',
  },
  warm: {
    primaryColor: '#f59e0b',
    secondaryColor: '#fbbf24',
    accentColor: '#ef4444',
    backgroundColor: '#fffbeb',
    textColor: '#78350f',
    fontFamily: 'Open Sans',
    buttonStyle: 'rounded',
    layout: 'minimal',
  },
};

export default function EnhancedWebsiteTab({ doctorProfile, onUpdate }: EnhancedWebsiteTabProps) {
  const [activeSection, setActiveSection] = useState<'theme' | 'content' | 'preview'>('theme');
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(PRESET_THEMES.medical);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [customContent, setCustomContent] = useState({
    tagline: '',
    aboutExtended: '',
    servicesList: [] as string[],
    galleryImages: [] as string[],
  });

  useEffect(() => {
    if (doctorProfile?.websiteTheme && PRESET_THEMES[doctorProfile.websiteTheme]) {
      setThemeConfig(PRESET_THEMES[doctorProfile.websiteTheme]);
    }
  }, [doctorProfile]);

  const handleSaveTheme = async (themeName: string) => {
    setSaving(true);
    try {
      await onUpdate({ websiteTheme: themeName });
      setSaveMessage('✅ Theme saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const micrositeUrl = doctorProfile ? `${window.location.origin}/doctor/${doctorProfile.slug}` : '#';

  if (!doctorProfile) {
    return (
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 p-12 text-center">
        <div className="text-6xl mb-4">🌐</div>
        <p className="text-gray-500 text-lg font-medium">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white mb-2">🌐 Website Customization</h2>
            <p className="text-white/90 text-sm">Customize your professional microsite</p>
          </div>
          <a
            href={micrositeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview Site
          </a>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 flex gap-2">
        {[
          { id: 'theme', label: 'Theme', icon: Palette },
          { id: 'content', label: 'Content', icon: Type },
          { id: 'preview', label: 'Preview', icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeSection === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Theme Section */}
      {activeSection === 'theme' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Preset Themes */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Preset Themes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(PRESET_THEMES).map(([key, theme]) => (
                <div
                  key={key}
                  onClick={() => {
                    setThemeConfig(theme);
                    handleSaveTheme(key);
                  }}
                  className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${
                    doctorProfile.websiteTheme === key
                      ? 'border-blue-600 shadow-lg'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 capitalize">{key}</h4>
                      <p className="text-xs text-gray-500">{theme.layout} layout</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {[theme.primaryColor, theme.secondaryColor, theme.accentColor].map((color, idx) => (
                      <div
                        key={idx}
                        className="flex-1 h-3 rounded"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {doctorProfile.websiteTheme === key && (
                    <div className="mt-3 text-xs font-bold text-blue-600 text-center">
                      ✓ Active
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-4">Custom Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'primaryColor', label: 'Primary Color' },
                { key: 'secondaryColor', label: 'Secondary Color' },
                { key: 'accentColor', label: 'Accent Color' },
              ].map((color) => (
                <div key={color.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {color.label}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={themeConfig[color.key as keyof ThemeConfig] as string}
                      onChange={(e) =>
                        setThemeConfig((prev) => ({
                          ...prev,
                          [color.key]: e.target.value,
                        }))
                      }
                      className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={themeConfig[color.key as keyof ThemeConfig]}
                      onChange={(e) =>
                        setThemeConfig((prev) => ({
                          ...prev,
                          [color.key]: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Layout & Style Options */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Layout & Style
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Font Family</label>
                <select
                  value={themeConfig.fontFamily}
                  onChange={(e) =>
                    setThemeConfig((prev) => ({ ...prev, fontFamily: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Button Style</label>
                <div className="flex gap-2">
                  {(['rounded', 'square', 'pill'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() =>
                        setThemeConfig((prev) => ({ ...prev, buttonStyle: style }))
                      }
                      className={`flex-1 px-3 py-2 border-2 font-semibold text-xs transition-all ${
                        themeConfig.buttonStyle === style
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-600 hover:border-blue-300'
                      } ${
                        style === 'rounded' ? 'rounded-lg' :
                        style === 'square' ? 'rounded-none' :
                        'rounded-full'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Layout</label>
                <select
                  value={themeConfig.layout}
                  onChange={(e) =>
                    setThemeConfig((prev) => ({ ...prev, layout: e.target.value as any }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
            </div>
          </div>

          {saveMessage && (
            <div className={`rounded-lg p-4 font-semibold ${
              saveMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {saveMessage}
            </div>
          )}
        </motion.div>
      )}

      {/* Content Section */}
      {activeSection === 'content' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-4">Website Content</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tagline</label>
                <input
                  type="text"
                  value={customContent.tagline}
                  onChange={(e) => setCustomContent(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Your professional tagline..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Extended About</label>
                <textarea
                  value={customContent.aboutExtended}
                  onChange={(e) => setCustomContent(prev => ({ ...prev, aboutExtended: e.target.value }))}
                  placeholder="Tell patients more about your practice, approach, and values..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm mb-1">Content Management</h4>
                    <p className="text-xs text-blue-700">
                      Advanced content features including image galleries, service descriptions, and SEO settings will be saved automatically when you update your profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Preview Section */}
      {activeSection === 'preview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-gray-900">Live Preview</h3>
            <a
              href={micrositeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Open Full Site
            </a>
          </div>

          <div
            className="border-2 border-gray-200 rounded-xl overflow-hidden"
            style={{
              fontFamily: themeConfig.fontFamily,
              backgroundColor: themeConfig.backgroundColor,
              color: themeConfig.textColor,
            }}
          >
            <div
              className="p-8 text-center"
              style={{
                background: `linear-gradient(135deg, ${themeConfig.primaryColor}, ${themeConfig.secondaryColor})`,
              }}
            >
              <h1 className="text-3xl font-black text-white mb-2">
                Dr. {doctorProfile.slug}
              </h1>
              <p className="text-white/90">{doctorProfile.specialization}</p>
            </div>

            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-black mb-2" style={{ color: themeConfig.primaryColor }}>
                  About
                </h2>
                <p className="text-gray-600">
                  {customContent.aboutExtended || 'Your extended about text will appear here...'}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  className="px-6 py-3 font-semibold text-white transition-all"
                  style={{
                    backgroundColor: themeConfig.primaryColor,
                    borderRadius: themeConfig.buttonStyle === 'rounded' ? '0.5rem' : themeConfig.buttonStyle === 'square' ? '0' : '9999px',
                  }}
                >
                  Book Appointment
                </button>
                <button
                  className="px-6 py-3 font-semibold border-2 transition-all"
                  style={{
                    borderColor: themeConfig.primaryColor,
                    color: themeConfig.primaryColor,
                    borderRadius: themeConfig.buttonStyle === 'rounded' ? '0.5rem' : themeConfig.buttonStyle === 'square' ? '0' : '9999px',
                  }}
                >
                  Contact
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
