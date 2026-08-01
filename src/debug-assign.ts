import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { WorkflowAutoAssignService } from "./modules/workflow/services/workflow-auto-assign.service";
import { ConfigService } from "@nestjs/config";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const company = await prisma.company.findFirst();
  const service = new WorkflowAutoAssignService(prisma, new ConfigService());
  const targetDeptId = await prisma.department.findFirst({ where: { name: "Video Editing" }});
  
  const ownerId = await (service as any).resolveDepartmentOwner(company!.id, targetDeptId?.id || null, "ROUND_ROBIN", null, { title: "Edit Reel 1", type: "REEL", departmentName: "Video Editor" }, { departmentId: null, name: "Video Editing & Reels Deliverables" } as any);
  console.log("Resolved owner:", ownerId);
  if (ownerId) {
      const u = await prisma.user.findUnique({ where: { id: ownerId }});
      console.log("Resolved user email:", u?.email);
  }
}
main().finally(() => prisma.$disconnect());
