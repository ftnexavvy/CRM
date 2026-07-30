import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function testRegenerate() {
  const client = await prisma.client.findFirst({
    include: {
      services: {
        include: {
          service: true
        }
      }
    }
  });

  if (!client) {
    console.log("No client found!");
    return;
  }

  console.log("Client found:", client.name, "ID:", client.id);
  console.log("Services:", JSON.stringify(client.services, null, 2));

  const workflow = await prisma.workflow.findFirst({
    where: { subjectId: client.id },
    include: { tasks: true }
  });

  if (workflow) {
    console.log("Current Workflow tasks count:", workflow.tasks.length);
    console.log("Sample task:", JSON.stringify(workflow.tasks[0], null, 2));
    console.log("Graphics task sample:", JSON.stringify(workflow.tasks.find(t => t.title.includes("Design Post")), null, 2));
  }
}

testRegenerate().then(() => prisma.$disconnect());
