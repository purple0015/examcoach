import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting cleanup of legacy local document records...');
  
  const deleted = await prisma.document.deleteMany({
    where: {
      OR: [
        { fileUrl: { startsWith: '/opt/' } },
        { fileUrl: { startsWith: '/uploads/' } },
        { fileUrl: { startsWith: 'uploads/' } },
        { fileUrl: { startsWith: 'local://' } },
      ],
    },
  });

  console.log(`Successfully cleaned up ${deleted.count} legacy local documents.`);
}

main()
  .catch((e) => {
    console.error('Error cleaning up legacy files:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
