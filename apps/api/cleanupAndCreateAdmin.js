const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function cleanupAndCreateAdmin() {
  try {
    console.log('🔍 Starting admin account cleanup...');
    
    // Find all existing admin accounts
    const existingAdmins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });
    
    console.log(`📋 Found ${existingAdmins.length} existing admin accounts:`);
    existingAdmins.forEach(admin => {
      console.log(`   - ID: ${admin.id}, Email: ${admin.email}`);
    });
    
    if (existingAdmins.length > 0) {
      console.log('🗑️  Deleting all existing admin accounts...');
      
      // Delete all admin accounts
      await prisma.user.deleteMany({
        where: { role: 'ADMIN' }
      });
      
      console.log('✅ All existing admin accounts deleted successfully');
    }
    
    // Create the new admin account
    console.log('👤 Creating new admin account...');
    
    const hashedPassword = await bcrypt.hash('Monusinghamit10', 10);
    
    const newAdmin = await prisma.user.create({
      data: {
        email: 'zinny461@gmail.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    
    console.log('✅ New admin account created successfully!');
    console.log(`   - ID: ${newAdmin.id}`);
    console.log(`   - Email: ${newAdmin.email}`);
    console.log(`   - Role: ${newAdmin.role}`);
    console.log(`   - Status: ${newAdmin.isActive ? 'Active' : 'Inactive'}`);
    
    console.log('\n🔐 Admin Login Credentials:');
    console.log(`   Email: zinny461@gmail.com`);
    console.log(`   Password: Monusinghamit10`);
    
    console.log('\n🌐 Access the secure admin panel at:');
    console.log(`   http://localhost:3000/admin-secure-panel-7x9y2z-2024/login`);
    
  } catch (error) {
    console.error('❌ Error during admin cleanup and creation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAndCreateAdmin();
