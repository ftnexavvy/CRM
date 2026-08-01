import "dotenv/config";
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { WorkflowAutoAssignService } from '../src/modules/workflow/services/workflow-auto-assign.service';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(WorkflowAutoAssignService);
  
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });
  
  const company = await prisma.company.findFirst();
  const client = await prisma.client.findFirst({ where: { name: { contains: "dixit", mode: "insensitive" } } });
  const user = await prisma.user.findFirst({ where: { companyId: company!.id }});

  console.log("Regenerating for client:", client!.name);
  await service.onboardClient(company!.id, user!.id, client!.id, true);
  console.log("Done");
  
  await app.close();
  await prisma.$disconnect();
}
bootstrap().catch(err => {
    console.error(err);
    process.exit(1);
});
