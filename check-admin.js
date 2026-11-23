const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const admin = await prisma.user.findFirst({ 
      where: { role: 'ADMIN' } 
    });
    
    if (admin) {
      console.log('✅ Admin user found:');
      console.log('Email:', admin.email);
      console.log('ID:', admin.id);
      console.log('Role:', admin.role);
    } else {
      console.log('❌ No admin user found in database');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
