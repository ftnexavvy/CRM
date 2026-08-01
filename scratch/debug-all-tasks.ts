import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const client = await prisma.client.findFirst({ where: { name: { contains: "dixit", mode: "insensitive" } } });
  if (!client) return;
  const wf = await prisma.workflow.findFirst({ where: { subjectId: client.id }});
  
  if (wf) {
      const tasks = await prisma.task.findMany({
          where: { workflowId: wf.id },
          include: { assignedTo: true, department: true }
      });
      console.log(`Total tasks for workflow: ${tasks.length}`);
      for (const t of tasks) {
          console.log(`Title: ${t.title} | Dept: ${t.department?.name} | Assigned: ${t.assignedTo?.email}`);
      }
  }
}
main().finally(() => prisma.$disconnect());
