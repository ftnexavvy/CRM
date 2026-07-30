import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function fixEmployeePermissions() {
  console.log("=== INSPECTING ALL PERMISSIONS ===");
  const allPermissions = await prisma.permission.findMany();
  console.log(allPermissions.map((p) => p.key));

  const employeeRoleNames = ["Employee", "EMPLOYEE", "Staff"];
  const employeeRoles = await prisma.role.findMany({
    where: { name: { in: employeeRoleNames } },
  });

  const employeePermKeys = [
    "Workflow.Read",
    "Workflow.Accept",
    "Workflow.Reject",
    "Workflow.Complete",
    "Workflow.Dashboard.Read",
    "Task.Read",
    "Task.Update",
    "Task.Comment",
    "Task.Attach",
    "Dashboard.View",
    "Chat.Read",
    "Chat.Create",
  ];

  const targetPermissions = allPermissions.filter((p) => employeePermKeys.includes(p.key));
  console.log("\nFound target permissions count:", targetPermissions.length);

  for (const role of employeeRoles) {
    await prisma.rolePermission.createMany({
      data: targetPermissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    console.log(`✅ Granted Employee permissions to Role: ${role.name} (${role.id})`);
  }

  console.log("Employee permissions fix complete! 🎉");
}

fixEmployeePermissions().then(() => prisma.$disconnect());
