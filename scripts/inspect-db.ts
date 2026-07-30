import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function inspectDb() {
  console.log("=== INSPECTING DEPARTMENTS ===");
  const depts = await prisma.department.findMany();
  console.log(JSON.stringify(depts, null, 2));

  console.log("\n=== INSPECTING USERS ===");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
      departmentId: true,
      designation: true,
      companyId: true,
      status: true,
    },
  });
  console.log(JSON.stringify(users, null, 2));

  console.log("\n=== INSPECTING SERVICES ===");
  const services = await prisma.service.findMany({
    select: {
      id: true,
      name: true,
      departmentId: true,
      companyId: true,
    },
  });
  console.log(JSON.stringify(services, null, 2));
}

inspectDb().then(() => prisma.$disconnect());
