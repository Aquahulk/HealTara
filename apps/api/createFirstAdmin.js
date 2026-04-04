const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createFirstAdmin() {
  try {
    console.log('🔐 Creating first admin account...');
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (existingAdmin) {
      console.log('⚠️  Admin account already exists:', existingAdmin.email);
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('Monusinghamit@10', 12);
    
    // Create the admin user
    const admin = await prisma.user.create({
      data: {
        email: 'zinny461@gmail.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    
    console.log('✅ First admin account created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Role:', admin.role);
    console.log('🆔 User ID:', admin.id);
    console.log('');
    console.log('🔒 You can now login to the secure admin panel at:');
    console.log('   /admin-secure-panel-7x9y2z-2024/login');
    console.log('');
    console.log('⚠️  IMPORTANT: Delete this script after first use for security!');
    
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createFirstAdmin();
