"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import DoctorGridCard from '@/components/DoctorGridCard';
import SaveButton from '@/components/SaveButton';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { EnhancedRatingDisplay } from '@/components/SimpleRatingDisplay';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';
import { apiClient } from '@/lib/api';

export default function SavedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'doctors' | 'hospitals'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/saved');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchSavedItems();
    }
  }, [user]);

  const fetchSavedItems = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSavedItems();
      setSavedItems(data || []);
    } catch (error) {
      console.error('Failed to fetch saved items', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (!user && loading)) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const doctors = savedItems.filter(item => item.entityType === 'doctor');
  const hospitals = savedItems.filter(item => item.entityType === 'hospital');

  const displayItems = activeTab === 'all' 
    ? savedItems 
    : activeTab === 'doctors' 
      ? doctors 
      : hospitals;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Saved Items</h1>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 pb-1 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All ({savedItems.length})
          </button>
          <button 
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'doctors' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Doctors ({doctors.length})
          </button>
          <button 
            onClick={() => setActiveTab('hospitals')}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'hospitals' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Hospitals ({hospitals.length})
          </button>
        </div>

        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[1,2,3].map(i => (
               <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
             ))}
           </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No saved items found.</p>
            <p className="text-gray-400 text-sm mt-2">Bookmark doctors and hospitals to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayItems.map((item) => {
              if (item.entityType === 'doctor') {
                const doctor = {
                  id: item.entityId,
                  email: item.details.email,
                  doctorProfile: {
                    specialization: item.details.specialization,
                    clinicName: item.details.clinicName,
                    city: item.details.city,
                    consultationFee: item.details.fee,
                    profileImage: item.details.image,
                    slug: item.details.slug
                  }
                };
                return (
                  <DoctorGridCard key={`doc-${item.entityId}`} doctor={doctor as any} />
                );
              } else {
                const h = item.details;
                return (
                    <div key={`hosp-${item.entityId}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative">
                      <div className="absolute top-2 right-2 z-10">
                        <SaveButton entityType="hospital" entityId={item.entityId} />
                      </div>
                      <div className="p-5 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {h.image ? (
                            <img src={h.image} alt={h.name} className="w-14 h-14 rounded-xl object-cover" />
                          ) : (
                            <Building2 className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{h.name}</h3>
                          <p className="text-sm text-gray-600 truncate mb-1">{h.city}</p>
                          <div className="flex items-center text-xs text-gray-500">
                             <Building2 className="w-3 h-3 mr-1" />
                             <span>{h.departmentCount || 0} Departments</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-5 pb-3">
                        <EnhancedRatingDisplay entityType="hospital" entityId={String(item.entityId)} size="sm" />
                      </div>
                      <div className="p-4 border-t border-gray-200">
                        <a
                          href={`/hospital-site/${item.entityId}`}
                          className="block w-full text-center bg-gray-50 hover:bg-gray-100 text-gray-900 font-medium py-2 rounded-lg transition-colors"
                        >
                          Visit Website
                        </a>
                      </div>
                    </div>
                );
              }
            })}
          </div>
        )}
      </main>
      <MobileBottomNavigation />
    </div>
  );
}
