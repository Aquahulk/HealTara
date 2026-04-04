// ============================================================================
// 💬 FIXED CONTACT SECTION - Properly structured JSX
// ============================================================================
// This replaces the problematic contact section in hospital-site/[id]/page.tsx
// ============================================================================

const contactSectionFixed = `
        {/* Contact & Emergency */}
        <section className="relative">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Contact & Emergency</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">We're here for you 24/7. Contact us through any of these methods.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Emergency Services */}
            <div className="bg-gradient-to-br from-red-50 to-pink-100 p-8 rounded-3xl shadow-lg border-l-4 border-red-500">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🚑</div>
                <h3 className="text-3xl font-bold text-red-600 mb-2">Emergency Services</h3>
                <p className="text-lg text-gray-700 mb-6">24/7 emergency care when you need it most</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-red-600">Emergency Hotline</h4>
                    <p className="text-gray-700">Call immediately for life-threatening emergencies</p>
                  </div>
                  <a href="tel:911" className="bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg text-center">911</a>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-purple-600 mb-2">Ambulance Service</h4>
                    <p className="text-gray-700">Fast response medical transport</p>
                  </div>
                  <a href="tel:AMBULANCE" className="bg-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg text-center">AMBULANCE</a>
                </div>
              </div>
            </div>
            
            {/* General Contact */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-3xl shadow-lg border-l-4 border-blue-500">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📞</div>
                <h3 className="text-3xl font-bold text-blue-600 mb-2">General Contact</h3>
                <p className="text-lg text-gray-700 mb-6">Get in touch for appointments and inquiries</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-blue-600 mb-2">Reception</h4>
                    <p className="text-gray-700">Main reception desk and patient services</p>
                  </div>
                  <a href="tel:RECEPTION" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg text-center">RECEPTION</a>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-green-600 mb-2">Appointments</h4>
                    <p className="text-gray-700">Schedule your consultation and book appointments</p>
                  </div>
                  <a href="tel:APPOINTMENTS" className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg text-center">APPOINTMENTS</a>
                </div>
              </div>
            </div>
          </div>
        </section>
`;

export default contactSectionFixed;
