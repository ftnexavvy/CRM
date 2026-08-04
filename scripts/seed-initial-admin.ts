import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";

const connectionString = process.env.DATABASE_URL || "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const permissionsList = [
  ["User", "Create", "Create employees"], ["User", "Read", "View employees"], ["User", "Update", "Update employees"], ["User", "Delete", "Deactivate employees"],
  ["Role", "Create", "Create roles"], ["Role", "Read", "View roles"], ["Role", "Update", "Update roles and assignments"], ["Role", "Delete", "Delete roles"],
  ["Permission", "Read", "View permission catalogue"], ["Dashboard", "View", "View dashboard"],
  ["Lead", "Create", "Create leads"], ["Lead", "Read", "View leads"], ["Lead", "Update", "Update leads"], ["Lead", "Delete", "Delete leads"],
  ["Client", "Create", "Create clients"], ["Client", "Read", "View clients"], ["Project", "Assign", "Assign projects"], ["Task", "Update", "Update tasks"],
  ["Department", "Create", "Create departments"], ["Department", "Read", "View departments"], ["Department", "Update", "Update departments"],
  ["Workflow", "Create", "Create workflows"], ["Workflow", "Read", "View workflows"], ["Workflow", "Assign", "Assign work"], ["Workflow", "Transfer", "Transfer work"],
  ["Workflow", "Accept", "Accept work"], ["Workflow", "Reject", "Reject work"], ["Workflow", "Complete", "Complete work"], ["Workflow", "Approve", "Approve workflows"],
  ["Workflow", "Delete", "Delete workflows"],
  ["Workflow", "Dashboard.Read", "View workflow dashboards"], ["Task", "Generate", "Generate workflow tasks"], ["Task", "Assign", "Assign generated tasks"], ["Task", "Comment", "Comment on tasks"], ["Task", "Attach", "Attach files to tasks"],
];

async function main() {
  console.log("Seed script connecting to DB...");

  // 1. Seed Permissions
  for (const [module, action, description] of permissionsList) {
    const key = `${module}.${action}`;
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { module, action, key, description },
    });
  }

  // 2. Seed Company
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        companyName: "FT Nexavvy CRM",
        companyCode: "FTNEX",
        email: "admin@ftcrm.com",
        phone: "+91-9999999999",
      },
    });
  }

  // 3. Seed Admin Role
  let role = await prisma.role.findFirst({
    where: { companyId: company.id, name: "Administrator" },
  });
  if (!role) {
    role = await prisma.role.create({
      data: {
        companyId: company.id,
        name: "Administrator",
        description: "Full system administration access",
        isSystemRole: true,
      },
    });
  }

  // 4. Map all permissions to Admin Role
  const allPermissions = await prisma.permission.findMany();
  await prisma.rolePermission.createMany({
    data: allPermissions.map((perm) => ({
      roleId: role.id,
      permissionId: perm.id,
    })),
    skipDuplicates: true,
  });

  // 5. Seed Departments
  const deptNames = ["Management", "Development", "Design", "Marketing", "Sales", "Support"];
  for (const deptName of deptNames) {
    const code = deptName.substring(0, 3).toUpperCase();
    await prisma.department.upsert({
      where: { companyId_name: { companyId: company.id, name: deptName } },
      update: {},
      create: {
        companyId: company.id,
        name: deptName,
        code,
      },
    });
  }

  // 6. Seed Admin Users (admin@ftcrm.com and admin@example.com)
  const adminEmails = ["admin@ftcrm.com", "admin@example.com"];
  const passwordHash = await argon2.hash("admin123");

  for (const email of adminEmails) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          companyId: company.id,
          roleId: role.id,
          firstName: "Admin",
          lastName: "User",
          email,
          password: passwordHash,
          designation: "System Administrator",
          department: "Management",
          status: "ACTIVE",
        },
      });
      console.log(`✅ Admin User created: ${email}`);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: passwordHash, status: "ACTIVE", roleId: role.id },
      });
      console.log(`✅ Admin User updated & password set to 'admin123': ${email}`);
    }
  }

  console.log("\n============================================");
  console.log("🎉 SEED COMPLETED SUCCESSFULLY");
  console.log("Allowed Admin Emails: admin@ftcrm.com, admin@example.com");
  console.log("Password            : admin123");
  console.log("============================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding DB:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
