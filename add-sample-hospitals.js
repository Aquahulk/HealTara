// ============================================================================
// 🏥 ADD SAMPLE HOSPITALS TO DATABASE
// ============================================================================

const hospitals = [
  {
    name: "City General Hospital",
    address: "123 Main Street, Downtown",
    city: "New York",
    state: "NY",
    phone: "+1-555-0123",
    subdomain: "citygeneral",
    profile: {
      general: {
        tagline: "Your Health, Our Priority",
        description: "Comprehensive healthcare services for the community"
      }
    }
  },
  {
    name: "Memorial Medical Center",
    address: "456 Oak Avenue",
    city: "Los Angeles",
    state: "CA",
    phone: "+1-555-0456",
    subdomain: "memorial",
    profile: {
      general: {
        tagline: "Excellence in Healthcare",
        description: "State-of-the-art medical facility with expert staff"
      }
    }
  },
  {
    name: "St. Mary's Hospital",
    address: "789 Pine Street",
    city: "Chicago",
    state: "IL",
    phone: "+1-555-0789",
    subdomain: "stmarys",
    profile: {
      general: {
        tagline: "Compassionate Care",
        description: "Dedicated to providing quality healthcare with compassion"
      }
    }
  }
];

// Function to add hospitals via API
async function addHospitals() {
  console.log('🏥 Adding sample hospitals to database...');
  
  for (const hospital of hospitals) {
    try {
      const response = await fetch('http://localhost:3000/api/hospitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hospital),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Added: ${hospital.name}`);
        console.log(`   ID: ${result.data.id}`);
      } else {
        console.error(`❌ Failed to add: ${hospital.name}`);
        console.error(`   Status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error adding ${hospital.name}:`, error.message);
    }
  }
  
  console.log('\n🎉 Done! Check your homepage for hospitals!');
  console.log('📱 Visit: http://localhost:3000');
}

// Run the function
addHospitals();
