import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log("Starting role assignment update...");

  const companies = await prisma.company.findMany();

  for (const company of companies) {
    let adminRole = await prisma.role.findFirst({
      where: { companyId: company.id, name: { in: ["Admin", "Administrator", "ADMIN"] } },
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          companyId: company.id,
          name: "Admin",
          description: "Administrator with full system permissions",
          isSystemRole: true,
        },
      });
      console.log(`Created Admin role for company ${company.companyName}`);
    }

    let employeeRole = await prisma.role.findFirst({
      where: { companyId: company.id, name: { in: ["Employee", "EMPLOYEE", "Staff"] } },
    });

    if (!employeeRole) {
      employeeRole = await prisma.role.create({
        data: {
          companyId: company.id,
          name: "Employee",
          description: "Standard employee role with task-specific access",
          isSystemRole: false,
        },
      });
      console.log(`Created Employee role for company ${company.companyName}`);
    }

    // Attach all permissions to Admin role
    const allPermissions = await prisma.permission.findMany();
    if (allPermissions.length) {
      await prisma.rolePermission.createMany({
        data: allPermissions.map((permission: any) => ({ roleId: adminRole.id, permissionId: permission.id })),
        skipDuplicates: true,
      });
    }

    // Attach basic task/read permissions to Employee role
    const employeePermissions = allPermissions.filter((p: any) =>
      [
        "Workflow.Read",
        "Workflow.Accept",
        "Workflow.Reject",
        "Workflow.Complete",
        "Workflow.Dashboard.Read",
        "Task.Update",
        "Task.Comment",
        "Task.Attach",
        "Dashboard.View",
        "Permission.Read",
      ].includes(p.key)
    );
    if (employeePermissions.length) {
      await prisma.rolePermission.createMany({
        data: employeePermissions.map((permission: any) => ({ roleId: employeeRole.id, permissionId: permission.id })),
        skipDuplicates: true,
      });
    }

    // Update users: admin@example.com gets Admin role, others get Employee role
    const users = await prisma.user.findMany({ where: { companyId: company.id } });

    for (const user of users) {
      const isTargetAdmin = user.email.toLowerCase().includes("admin@example.com") || user.email.toLowerCase().includes("admin");
      if (isTargetAdmin) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: adminRole.id },
        });
        console.log(`✅ Assigned ADMIN role to ${user.email}`);
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: employeeRole.id },
        });
        console.log(`👤 Assigned EMPLOYEE role to ${user.email}`);
      }
    }
  }

  console.log("Role assignment update complete! 🎉");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
