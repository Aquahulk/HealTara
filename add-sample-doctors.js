// ============================================================================
// 🧥 ADD SAMPLE DOCTORS TO DATABASE
// ============================================================================

const doctors = [
  {
    name: "Dr. Sarah Johnson",
    specialization: "Cardiology",
    experience: 15,
    consultationFee: 150,
    city: "New York",
    state: "NY",
    phone: "+1-555-0101",
    profile: {
      general: {
        tagline: "Expert Heart Care",
        description: "Specialized in cardiovascular diseases"
      }
    }
  },
  {
    name: "Dr. Michael Chen",
    specialization: "Neurology",
    experience: 12,
    consultationFee: 200,
    city: "Los Angeles",
    state: "CA",
    phone: "+1-555-0102",
    profile: {
      general: {
        tagline: "Brain & Nerve Specialist",
        description: "Expert in neurological disorders"
      }
    }
  },
  {
    name: "Dr. Emily Rodriguez",
    specialization: "Pediatrics",
    experience: 8,
    consultationFee: 120,
    city: "Chicago",
    state: "IL",
    phone: "+1-555-0103",
    profile: {
      general: {
        tagline: "Child Healthcare Expert",
        description: "Dedicated to children's health"
      }
    }
  }
];

// Function to add doctors via API
async function addDoctors() {
  console.log('🧥 Adding sample doctors to database...');
  
  for (const doctor of doctors) {
    try {
      const response = await fetch('http://localhost:3000/api/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(doctor),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Added: ${doctor.name}`);
        console.log(`   ID: ${result.data.id}`);
      } else {
        console.error(`❌ Failed to add: ${doctor.name}`);
        console.error(`   Status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error adding ${doctor.name}:`, error.message);
    }
  }
  
  console.log('\n🎉 Done! Check your homepage for doctors!');
  console.log('📱 Visit: http://localhost:3000');
}

// Run the function
addDoctors();
