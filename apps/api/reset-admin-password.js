
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔄 Resetting admin password...');

    // Find the admin account
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log(`✅ Found admin account: ${existingAdmin.email}`);

      // Hash the new password
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Update the password
      const updatedAdmin = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword }
      });

      console.log('✅ Admin password reset successfully!');
      console.log('\n🔐 New Login Credentials:');
      console.log(`   Email: ${updatedAdmin.email}`);
      console.log(`   Password: admin123`);
      console.log('\n🌐 Access the secure admin panel at:');
      console.log(`   http://localhost:3000/admin-secure-panel-7x9y2z-2024/login`);
    } else {
      console.log('⚠️  No admin account found! Creating one...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@healtara.com',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      
      console.log('✅ Admin account created successfully!');
      console.log('\n🔐 New Login Credentials:');
      console.log(`   Email: admin@healtara.com`);
      console.log(`   Password: admin123`);
      console.log('\n🌐 Access the secure admin panel at:');
      console.log(`   http://localhost:3000/admin-secure-panel-7x9y2z-2024/login`);
    }
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
