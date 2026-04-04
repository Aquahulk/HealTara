'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testEndpoints = [
    {
      name: 'Get All Users',
      action: () => apiClient.getUsers(),
    },
    {
      name: 'Get All Doctors',
      action: () => apiClient.getDoctors(),
    },
    {
      name: 'Get Doctor by Slug (dr-sharmaaa)',
      action: () => apiClient.getDoctorBySlug('dr-sharmaaa'),
    },
    {
      name: 'Login (test.patient@example.com)',
      action: () => apiClient.login('test.patient@example.com', 'password123'),
    },
    {
      name: 'Login (dr.sharmaa@example.com)',
      action: () => apiClient.login('dr.sharmaa@example.com', 'doctorpassword'),
    },
    {
      name: 'Get My Appointments (requires login)',
      action: () => apiClient.getMyAppointments(),
    },
    {
      name: 'Set Doctor Slug',
      action: () => apiClient.setDoctorSlug('dr.sharmaa@example.com', 'dr-sharmaaa'),
    },
  ];

  const handleTest = async (action: () => Promise<any>) => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await action();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Client Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {testEndpoints.map((endpoint, index) => (
            <button
              key={index}
              onClick={() => handleTest(endpoint.action)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
            >
              {endpoint.name}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="text-blue-400">Loading...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-900 border border-red-700 rounded p-4 mb-4">
            <h3 className="text-red-400 font-bold mb-2">Error:</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-gray-800 border border-gray-700 rounded p-4">
            <h3 className="text-green-400 font-bold mb-2">Result:</h3>
            <pre className="text-sm text-gray-300 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-gray-800 border border-gray-700 rounded p-4">
          <h3 className="text-yellow-400 font-bold mb-2">Current Token:</h3>
          <p className="text-sm text-gray-300 break-all">
            {apiClient.getToken() || 'No token stored'}
          </p>
          {apiClient.getToken() && (
            <button
              onClick={() => {
                apiClient.clearToken();
                setResult(null);
                setError('');
              }}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
            >
              Clear Token
            </button>
          )}
        </div>
      </div>
    </div>
  );
}