import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seedDepartments() {
  const companies = await prisma.company.findMany();

  for (const company of companies) {
    const defaultDepts = [
      { name: "Social Media Department", code: "SOCIAL_MEDIA" },
      { name: "Graphics Design Department", code: "GRAPHICS_DESIGN" },
      { name: "Video Editing Department", code: "VIDEO_EDITING" },
      { name: "Account Management", code: "ACCOUNT_MANAGEMENT" },
    ];

    for (const d of defaultDepts) {
      const existing = await prisma.department.findFirst({
        where: { companyId: company.id, code: d.code },
      });
      if (!existing) {
        await prisma.department.create({
          data: {
            companyId: company.id,
            name: d.name,
            code: d.code,
            isActive: true,
          },
        });
        console.log(`✅ Created Department '${d.name}' for company ${company.companyName}`);
      }
    }
  }

  console.log("Department seeding complete! 🎉");
}

seedDepartments().then(() => prisma.$disconnect());
