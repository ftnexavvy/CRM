import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { UserService } from "../src/modules/user/services/user.service";
import { UserRepository } from "../src/modules/user/repositories/user.repository";
import { RoleRepository } from "../src/modules/role/repositories/role.repository";

const connectionString = process.env.DATABASE_URL || "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function testCreateUser() {
  const company = await prisma.company.findFirst();
  const role = await prisma.role.findFirst({ where: { companyId: company?.id } });
  const dept = await prisma.department.findFirst({ where: { companyId: company?.id } });

  if (!company || !role || !dept) return;

  const userRepo = new UserRepository(prisma as any);
  const roleRepo = new RoleRepository(prisma as any);
  const userService = new UserService(userRepo, roleRepo);

  console.log("Testing user creation with departmentId:", dept.id);
  const newUser = await userService.create(company.id, {
    firstName: "Test",
    lastName: "Designer",
    email: `test.designer.${Date.now()}@example.com`,
    password: "Password123!",
    roleId: role.id,
    department: dept.name,
    departmentId: dept.id,
    designation: "Graphic Designer",
  });

  console.log("✅ User created successfully:", newUser.email, "departmentId:", newUser.departmentId);
}

testCreateUser().then(() => prisma.$disconnect());
