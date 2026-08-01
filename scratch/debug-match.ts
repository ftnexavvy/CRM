import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) return;
  const allDepartments = await prisma.department.findMany({ where: { companyId: company.id, isActive: true } });
  const allCompanyUsers = await prisma.user.findMany({ where: { companyId: company.id, status: "ACTIVE" } });

  const target = "videoeditor";

  let matchedDeptId = null;
  for (const d of allDepartments) {
      const nameLower = d.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const codeLower = d.code.toLowerCase().replace(/[^a-z0-9]/g, "");

      const isVideoTarget = true;
      const isVideoDept = nameLower.includes("video") || nameLower.includes("reel") || nameLower.includes("edit") || codeLower.includes("video") || codeLower.includes("reel") || codeLower.includes("edit");

      const isPhotoTarget = false;
      const isPhotoDept = nameLower.includes("photo") || nameLower.includes("shoot") || codeLower.includes("photo") || codeLower.includes("shoot");

      const match = (
          nameLower === target ||
          codeLower === target ||
          (isPhotoTarget && isPhotoDept) ||
          (!isPhotoTarget && false) ||
          (!isPhotoTarget && false) ||
          (!isPhotoTarget && isVideoTarget && isVideoDept && !isPhotoDept)
        );
      if (match) {
          console.log("MATCHED DEPT:", d.name);
          matchedDeptId = d.id;
      }
  }

  if (matchedDeptId) {
      const d = allDepartments.find(x => x.id === matchedDeptId);
      if (!d) return;
      const deptNameLower = d.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const deptCodeLower = d.code.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const u of allCompanyUsers) {
        const uDept = (u.department || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const uDesig = (u.designation || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const isVideoDept = deptNameLower.includes("video") || deptNameLower.includes("reel") || deptNameLower.includes("edit");
        const isVideoUser = uDept.includes("video") || uDept.includes("reel") || uDept.includes("edit") || uDesig.includes("video") || uDesig.includes("reel") || uDesig.includes("edit");

        const isPhotoDept = deptNameLower.includes("photo") || deptNameLower.includes("shoot");
        const isPhotoUser = uDept.includes("photo") || uDept.includes("shoot") || uDesig.includes("photo") || uDesig.includes("shoot");

        const match = (
          u.departmentId === d.id ||
          uDept === deptNameLower ||
          uDept === deptCodeLower ||
          uDept.includes(deptNameLower) ||
          (isPhotoDept && isPhotoUser) ||
          (!isPhotoDept && false) ||
          (!isPhotoDept && false) ||
          (!isPhotoDept && isVideoDept && isVideoUser && !isPhotoUser)
        );
        if (match) {
            console.log("MATCHED USER:", u.email, "for dept", d.name);
            console.log("u.departmentId === d.id :", u.departmentId === d.id);
            console.log("uDept === deptNameLower :", uDept === deptNameLower);
            console.log("uDept === deptCodeLower :", uDept === deptCodeLower);
            console.log("uDept.includes(deptNameLower) :", uDept.includes(deptNameLower));
        }
      }
  }
}
main().finally(() => prisma.$disconnect());
