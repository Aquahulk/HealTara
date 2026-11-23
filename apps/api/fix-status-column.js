const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixStatusColumns() {
  try {
    console.log('Fixing status column lengths...');
    
    // Fix all three status columns
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "staff_assignment_requests" 
        ALTER COLUMN "status" TYPE VARCHAR(30);
    `);
    console.log('✓ Fixed staff_assignment_requests.status');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "staff_assignments"
        ALTER COLUMN "status" TYPE VARCHAR(30);
    `);
    console.log('✓ Fixed staff_assignments.status');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "staff_profiles"
        ALTER COLUMN "status" TYPE VARCHAR(30);
    `);
    console.log('✓ Fixed staff_profiles.status');
    
    console.log('\n✅ All status columns fixed successfully!');
  } catch (error) {
    console.error('Error fixing status columns:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixStatusColumns();
