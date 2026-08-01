import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const client = await prisma.client.findFirst({ where: { name: { contains: "dixit", mode: "insensitive" } } });
  if (!client) return;

  const workflows = await prisma.workflow.findMany({ where: { subjectId: client.id }});
  for (const wf of workflows) {
      console.log("Workflow:", wf.id);
      const tasks = await prisma.task.findMany({ 
          where: { workflowId: wf.id, title: { contains: "Reel" } },
          include: { assignedTo: true, department: true }
      });
      for (const t of tasks) {
          console.log(`Task: ${t.title} | Dept: ${t.department?.name} | AssignedTo: ${t.assignedTo?.email}`);
      }
  }
}
main().finally(() => prisma.$disconnect());
