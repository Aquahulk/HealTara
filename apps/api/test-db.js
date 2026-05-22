const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$connect()
  .then(() => { console.log('✅ DB connected successfully'); return p.$disconnect(); })
  .catch(e => { console.error('❌ DB error:', e.message); process.exit(1); });
