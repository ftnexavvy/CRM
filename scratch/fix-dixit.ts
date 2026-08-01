import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { WorkflowAutoAssignService } from "../src/modules/workflow/services/workflow-auto-assign.service";
import { ConfigService } from "@nestjs/config";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const company = await prisma.company.findFirst();
  const client = await prisma.client.findFirst({ where: { name: { contains: "dixit", mode: "insensitive" } } });
  const user = await prisma.user.findFirst({ where: { companyId: company!.id }});

  const service = new WorkflowAutoAssignService(prisma as any, null as any, null as any, null as any);
  
  console.log("Regenerating for client:", client!.name);
  await service.onboardClient(company!.id, user!.id, client!.id, true);
  console.log("Done");
}
main().finally(() => prisma.$disconnect());
