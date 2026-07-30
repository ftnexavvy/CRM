import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function fixDepartmentIds() {
  console.log("Fixing User departmentId foreign keys...");
  const depts = await prisma.department.findMany();
  const users = await prisma.user.findMany();

  for (const user of users) {
    if (user.department) {
      const normUserDept = user.department.toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = depts.find((d) => {
        const normDeptName = d.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normDeptName === normUserDept || normDeptName.includes(normUserDept) || normUserDept.includes(normDeptName);
      });

      if (match) {
        await prisma.user.update({
          where: { id: user.id },
          data: { department: match.id },
        });
        console.log(`✅ Linked ${user.email} (${user.firstName}) to Department '${match.name}' (${match.id})`);
      }
    }
  }

  console.log("Database Department ID sync complete! 🎉");
}

fixDepartmentIds().then(() => prisma.$disconnect());
