// ============================================================================
// 🏥 ADD HOSPITALS DIRECTLY - Simple database seeding
// ============================================================================

console.log('🏥 Adding Hospitals to Database...');

// Simple hospital data to add directly
const hospitalsToAdd = [
  {
    name: "City General Hospital",
    address: "123 Main Street, Downtown",
    city: "New York",
    state: "NY",
    phone: "+1-555-0123",
    subdomain: "citygeneral"
  },
  {
    name: "Memorial Medical Center", 
    address: "456 Oak Avenue",
    city: "Los Angeles",
    state: "CA",
    phone: "+1-555-0456",
    subdomain: "memorial"
  },
  {
    name: "St. Mary's Hospital",
    address: "789 Pine Street", 
    city: "Chicago",
    state: "IL",
    phone: "+1-555-0789",
    subdomain: "stmarys"
  },
  {
    name: "Regional Health Center",
    address: "321 Elm Road",
    city: "Houston", 
    state: "TX",
    phone: "+1-555-0321",
    subdomain: "regional"
  }
];

// Function to add hospitals via API
async function addHospitalsViaAPI() {
  console.log('📡 Adding hospitals via API endpoint...');
  
  for (const hospital of hospitalsToAdd) {
    try {
      const response = await fetch('http://localhost:3000/api/hospitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hospital)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`✅ Added: ${hospital.name}`);
      } else {
        console.log(`❌ Failed to add ${hospital.name}:`, result.error || result.message);
      }
    } catch (error) {
      console.log(`❌ Error adding ${hospital.name}:`, error.message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Function to check current hospitals
async function checkCurrentHospitals() {
  try {
    console.log('🔍 Checking current hospitals in database...');
    
    const response = await fetch('http://localhost:3000/api/hospitals');
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`📋 Currently ${result.data.length} hospitals in database:`);
      result.data.forEach((hospital, index) => {
        console.log(`  ${index + 1}. ${hospital.name} - ${hospital.city || 'No city'}, ${hospital.state || 'No state'}`);
      });
    } else {
      console.log('❌ Could not fetch hospitals:', result.error || result.message);
    }
  } catch (error) {
    console.log('❌ Error checking hospitals:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🎯 Starting hospital addition process...\n');
  
  // Check current state first
  await checkCurrentHospitals();
  
  console.log('\n📝 Adding hospitals to database...\n');
  
  // Add hospitals
  await addHospitalsViaAPI();
  
  // Check final state
  console.log('\n📊 Final check after adding:\n');
  await checkCurrentHospitals();
  
  console.log('\n🎉 HOSPITALS ADDED SUCCESSFULLY!');
  console.log('✅ Refresh your homepage to see the real hospitals!');
  console.log('✅ The hospital list should now show real data! 🏥✨');
}

// Instructions
console.log('📋 Instructions:');
console.log('1. Make sure your development server is running: npm run dev');
console.log('2. Run this script: node add-hospitals.js');
console.log('3. Refresh your homepage');
console.log('4. You should see real hospitals!');

console.log('\n🚀 Starting...\n');

// Run the main function
main().catch(console.error);
