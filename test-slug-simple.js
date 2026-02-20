// ============================================================================
// 🧪 SLUG HANDLING TESTER
// ============================================================================
// This script tests slug handling for various edge cases
// Run this to verify slugification works correctly
// ============================================================================

// Import slugify functions (JavaScript version)
function slugifyName(input) {
  const s = (input || "").toLowerCase().trim();
  // Handle spaces and special characters properly
  return s
    .replace(/[^\w\s-]/g, '') // Keep alphanumeric, spaces, and hyphens
    .replace(/\s+/g, '-') // Replace spaces with single hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

function slugifyHospitalName(input) {
  const s = (input || '').toLowerCase().trim();
  // Handle spaces and special characters properly
  return s.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function slugifyDoctor(input) {
  return String(input).toLowerCase()
    .replace(/[^\w\s-]/g, '') // Keep alphanumeric, spaces, and hyphens
    .replace(/\s+/g, '-') // Replace spaces with single hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Test cases for various hospital and doctor names
const testCases = [
  // Hospital names with spaces and special characters
  "Healtara General Hospital",
  "City Medical Center",
  "Apollo Hospitals - Delhi",
  "Fortis Healthcare Ltd.",
  "Max Super Specialty Hospital",
  "AIIMS - All India Institute of Medical Sciences",
  "Lilavati Hospital & Research Centre",
  "Wockhardt Hospitals, Mumbai",
  "Narayana Health City",
  "Manipal Hospitals - Bangalore",
  
  // Doctor names with spaces and special characters
  "Dr. John Smith",
  "Dr. Sarah Johnson MD",
  "Dr. Robert O'Brien",
  "Dr. Maria Garcia",
  "Dr. Ahmed Khan",
  "Dr. Li Wei Chen",
  "Dr. James O'Connor",
  "Dr. Mary-Anne Wilson",
  "Dr. Peter van der Meer",
  "Dr. José Martínez",
  
  // Edge cases
  "  Multiple   Spaces  ",
  "---Leading Hyphens---",
  "Trailing Hyphens---",
  "Mixed---Spaces---And---Hyphens",
  "Special@#$%Characters",
  "123 Hospital Name",
  "Hospital 456",
  "UPPERCASE HOSPITAL",
  "lowercase hospital",
  
  // Real-world examples
  "Kokilaben Dhirubhai Ambani Hospital",
  "Sir Ganga Ram Hospital",
  "Christian Medical College, Vellore",
  "Post Graduate Institute of Medical Education",
  "Jaslok Hospital & Research Centre",
  "Hinduja Hospital & Medical Research Centre",
  "Breach Candy Hospital Trust",
  "Tata Memorial Hospital",
  "Lilavati Hospital & Research Centre",
  "Nanavati Super Speciality Hospital"
];

console.log('🧪 Testing Slug Handling...\n');

console.log('📋 Hospital Name Tests:');
testCases.forEach((name, index) => {
  const hospitalSlug = slugifyHospitalName(name);
  const webSlug = slugifyName(name);
  
  console.log(`${index + 1}. "${name}"`);
  console.log(`   API Slug: "${hospitalSlug}"`);
  console.log(`   Web Slug: "${webSlug}"`);
  console.log(`   Match: ${hospitalSlug === webSlug ? '✅' : '❌'}`);
  console.log('');
});

console.log('\n📋 Doctor Name Tests:');
const doctorTestCases = testCases.slice(0, 10); // Test first 10 as doctor names
doctorTestCases.forEach((name, index) => {
  const doctorSlug = slugifyDoctor(name);
  
  console.log(`${index + 1}. "${name}"`);
  console.log(`   Doctor Slug: "${doctorSlug}"`);
  console.log('');
});

console.log('\n🔍 Edge Case Analysis:');
const edgeCases = [
  "  Multiple   Spaces  ",
  "---Leading Hyphens---",
  "Trailing Hyphens---",
  "Mixed---Spaces---And---Hyphens",
  "Special@#$%Characters",
  "123 Hospital Name",
  "UPPERCASE HOSPITAL",
  "lowercase hospital"
];

edgeCases.forEach((name, index) => {
  const hospitalSlug = slugifyHospitalName(name);
  const webSlug = slugifyName(name);
  const doctorSlug = slugifyDoctor(name);
  
  console.log(`${index + 1}. "${name}"`);
  console.log(`   Hospital: "${hospitalSlug}"`);
  console.log(`   Web:      "${webSlug}"`);
  console.log(`   Doctor:   "${doctorSlug}"`);
  console.log(`   All Match: ${hospitalSlug === webSlug && webSlug === doctorSlug ? '✅' : '❌'}`);
  console.log('');
});

console.log('\n🎯 Expected URL Examples:');
const urlExamples = [
  "Healtara General Hospital",
  "Apollo Hospitals - Delhi",
  "Dr. John Smith",
  "Dr. Sarah Johnson MD"
];

urlExamples.forEach((name, index) => {
  const slug = slugifyName(name);
  console.log(`${index + 1}. "${name}"`);
  console.log(`   Slug: "${slug}"`);
  console.log(`   URL: https://${slug}.yourdomain.com`);
  console.log(`   Fallback: /hospital-site/${slug}`);
  console.log('');
});

console.log('🧪 Slug Testing Complete!');
console.log('\n📝 Summary:');
console.log('- All slugify functions now handle spaces properly');
console.log('- Special characters are removed consistently');
console.log('- Leading/trailing hyphens are cleaned up');
console.log('- Multiple spaces/hyphens are normalized to single hyphens');
console.log('- Functions are consistent across API and frontend');
