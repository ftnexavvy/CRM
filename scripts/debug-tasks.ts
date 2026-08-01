import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function debugTasks() {
  const workflow = await prisma.workflow.findFirst({
    where: { subjectType: "CLIENT" },
    orderBy: { createdAt: "desc" },
  });

  if (!workflow) { console.log("No workflow found"); return; }
  console.log(`\n=== WORKFLOW: ${workflow.title} (${workflow.id}) ===\n`);

  const tasks = await prisma.task.findMany({
    where: { workflowId: workflow.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, status: true, isLocked: true, serviceName: true, dependsOnTaskId: true },
  });

  console.log(`Total tasks: ${tasks.length}\n`);
  console.log("TITLE                              | STATUS      | LOCKED | serviceName              | dependsOnTaskId");
  console.log("-".repeat(110));
  for (const t of tasks) {
    const locked = t.isLocked ? "YES" : "no";
    const dep = t.dependsOnTaskId ? t.dependsOnTaskId.slice(-8) : "none";
    console.log(`${t.title.padEnd(35)}| ${t.status.padEnd(11)}| ${locked.padEnd(6)} | ${(t.serviceName||"").padEnd(24)}| ${dep}`);
  }

  // Duplicates
  const titleCount: Record<string,number> = {};
  tasks.forEach(t => titleCount[t.title] = (titleCount[t.title]||0)+1);
  const dups = Object.entries(titleCount).filter(([,c]) => c > 1);
  if (dups.length) {
    console.log(`\nDUPLICATE TASKS:`);
    dups.forEach(([title, count]) => {
      console.log(`  "${title}" appears ${count} times:`);
      tasks.filter(t => t.title === title).forEach(t =>
        console.log(`    id=...${t.id.slice(-8)} service=${t.serviceName} status=${t.status}`)
      );
    });
  }

  // Broken locks
  const completedIds = new Set(tasks.filter(t => t.status === "COMPLETED").map(t => t.id));
  const broken = tasks.filter(t => t.isLocked && t.dependsOnTaskId && completedIds.has(t.dependsOnTaskId));
  if (broken.length) {
    console.log(`\nBROKEN LOCKS (parent COMPLETED but child still LOCKED):`);
    broken.forEach(t => console.log(`  "${t.title}" → parent ...${t.dependsOnTaskId?.slice(-8)} is COMPLETED`));
  } else {
    console.log(`\nNo broken locks.`);
  }
}

debugTasks().then(() => prisma.$disconnect()).catch(console.error);
