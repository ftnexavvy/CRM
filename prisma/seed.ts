import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });
const permissions = [
  ["User", "Create", "Create employees"], ["User", "Read", "View employees"], ["User", "Update", "Update employees"], ["User", "Delete", "Deactivate employees"],
  ["Role", "Create", "Create roles"], ["Role", "Read", "View roles"], ["Role", "Update", "Update roles and assignments"], ["Role", "Delete", "Delete roles"],
  ["Permission", "Read", "View permission catalogue"], ["Dashboard", "View", "View dashboard"],
  ["Lead", "Create", "Create leads"], ["Lead", "Read", "View leads"], ["Lead", "Update", "Update leads"], ["Lead", "Delete", "Delete leads"],
  ["Client", "Create", "Create clients"], ["Client", "Read", "View clients"], ["Project", "Assign", "Assign projects"], ["Task", "Update", "Update tasks"],
];
async function main() {
  for (const [module, action, description] of permissions) {
    const key = `${module}.${action}`;
    await prisma.permission.upsert({ where: { key }, update: { description }, create: { module, action, key, description } });
  }
  // Preserve access for admins migrated from the former fixed enum model.
  const [adminRoles, allPermissions] = await Promise.all([
    prisma.role.findMany({ where: { name: { in: ["Administrator", "ADMIN"] } }, select: { id: true } }),
    prisma.permission.findMany({ select: { id: true } }),
  ]);
  if (adminRoles.length && allPermissions.length) {
    await prisma.rolePermission.createMany({ data: adminRoles.flatMap((role) => allPermissions.map((permission) => ({ roleId: role.id, permissionId: permission.id }))), skipDuplicates: true });
  }
}
main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
