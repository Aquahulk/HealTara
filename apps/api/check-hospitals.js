const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.hospital.findMany({ select: { id: true, name: true, subdomain: true } })
  .then(h => console.log(JSON.stringify(h, null, 2)))
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
