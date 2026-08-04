import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    where: {
      type: { in: ['CONTENT', 'POST', 'GRAPHIC', 'REEL', 'VIDEO'] }
    },
    include: {
      workflow: true
    }
  });

  console.log('Found tasks:', tasks.length);
  const relevant = tasks.filter(t => t.title.includes('Schedule'));
  console.log('Tasks with Schedule:', relevant.map(t => ({
    id: t.id,
    title: t.title,
    type: t.type,
    subjectType: t.workflow?.subjectType,
    subjectId: t.workflow?.subjectId
  })));
  
  if (relevant.length > 0 && relevant[0].workflow?.subjectId) {
     const client = await prisma.client.findUnique({ where: { id: relevant[0].workflow.subjectId } });
     console.log('Client:', client?.name);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
