import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const client = await prisma.client.findFirst({ where: { name: { contains: "dixit", mode: "insensitive" } } });
  if (!client) return;
  const wf = await prisma.workflow.findFirst({ where: { subjectId: client.id }});
  if (!wf) return;
  const tasks = await prisma.task.findMany({ 
      where: { workflowId: wf.id, title: "Edit Reel 1" }
  });
  console.log(tasks[0].createdAt, tasks[0].updatedAt);
}
main().finally(() => prisma.$disconnect());
