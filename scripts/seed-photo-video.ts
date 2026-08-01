import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as crypto from "crypto";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) throw new Error("No company found");

  let role = await prisma.role.findFirst({ where: { companyId: company.id, name: "Employee" } });
  if (!role) {
    role = await prisma.role.findFirst({ where: { companyId: company.id } });
  }
  if (!role) throw new Error("No role found");

  const dept = await prisma.department.create({
    data: {
      companyId: company.id,
      name: "Photography & Video Shoot",
      code: "PHOTO_VIDEO",
      isActive: true,
    }
  });

  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      firstName: "Shooter",
      lastName: "Pro",
      email: "shooter@example.com",
      password: "hashed_password_placeholder",
      department: dept.name,
      departmentId: dept.id,
      designation: "Photographer/Videographer",
      roleId: role.id,
      status: "ACTIVE",
    }
  });

  const service = await prisma.service.create({
    data: {
      companyId: company.id,
      name: "Photography & Video Shoot",
      description: "Professional photography and video shooting services",
      departmentId: dept.id,
      ownerId: user.id,
      taskType: "GENERIC",
    }
  });

  console.log("Seeded Photography & Video Shoot Department, Employee, and Service.");
  console.log("Department:", dept.name);
  console.log("Employee:", user.email);
  console.log("Service:", service.name);
}

main().catch(console.error).finally(() => prisma.$disconnect());
