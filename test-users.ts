import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, firstName: true, email: true, department: true, designation: true, role: { select: { name: true } } } });
  console.log("USERS:", JSON.stringify(users, null, 2));
  const depts = await prisma.department.findMany();
  console.log("DEPTS:", JSON.stringify(depts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
