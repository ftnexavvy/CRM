import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ConfigService } from "@nestjs/config";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const company = await prisma.company.findFirst();
  const client = await prisma.client.findFirst({ where: { name: { contains: "dixit", mode: "insensitive" } } });
  
  const allDepartments = await prisma.department.findMany({ where: { companyId: company!.id, isActive: true } });
  
  const getDepartmentId = (requestedName: string) => {
    if (!requestedName) return null;
    const target = requestedName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = allDepartments.find((d) => {
      const nameLower = d.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const codeLower = d.code.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isGraphicTarget = target.includes("graphic") || target.includes("grapic") || target.includes("design");
      const isGraphicDept = nameLower.includes("graphic") || nameLower.includes("grapic") || nameLower.includes("design") || codeLower.includes("graphic") || codeLower.includes("grapic") || codeLower.includes("design");
      const isSocialTarget = target.includes("social") || target.includes("smm");
      const isSocialDept = nameLower.includes("social") || nameLower.includes("smm") || codeLower.includes("social") || codeLower.includes("smm");
      const isVideoTarget = target.includes("video") || target.includes("reel") || target.includes("edit");
      const isVideoDept = nameLower.includes("video") || nameLower.includes("reel") || nameLower.includes("edit") || codeLower.includes("video") || codeLower.includes("reel") || codeLower.includes("edit");
      const isPhotoTarget = target.includes("photo") || target.includes("shoot");
      const isPhotoDept = nameLower.includes("photo") || nameLower.includes("shoot") || codeLower.includes("photo") || codeLower.includes("shoot");

      return (
        nameLower === target ||
        codeLower === target ||
        (isPhotoTarget && isPhotoDept) ||
        (!isPhotoTarget && isGraphicTarget && isGraphicDept) ||
        (!isPhotoTarget && isSocialTarget && isSocialDept) ||
        (!isPhotoTarget && isVideoTarget && isVideoDept && !isPhotoDept)
      );
    });
    return match ? match.id : null;
  };

  const allCompanyUsers = await prisma.user.findMany({ where: { companyId: company!.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" } });

  const resolveDepartmentOwner = (departmentId: string | null) => {
    const department = departmentId ? allDepartments.find(d => d.id === departmentId) : null;
    if (department) {
      const deptNameLower = department.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const deptCodeLower = department.code.toLowerCase().replace(/[^a-z0-9]/g, "");
      const departmentUsers = allCompanyUsers.filter((u) => {
        const uDept = (u.department || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const uDesig = (u.designation || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const isGraphicDept = deptNameLower.includes("graphic") || deptNameLower.includes("grapic") || deptNameLower.includes("design");
        const isGraphicUser = uDept.includes("graphic") || uDept.includes("grapic") || uDept.includes("design") || uDesig.includes("graphic") || uDesig.includes("grapic") || uDesig.includes("design");
        const isSocialDept = deptNameLower.includes("social") || deptNameLower.includes("smm");
        const isSocialUser = uDept.includes("social") || uDept.includes("smm") || uDesig.includes("social") || uDesig.includes("smm");
        const isVideoDept = deptNameLower.includes("video") || deptNameLower.includes("reel") || deptNameLower.includes("edit");
        const isVideoUser = uDept.includes("video") || uDept.includes("reel") || uDept.includes("edit") || uDesig.includes("video") || uDesig.includes("reel") || uDesig.includes("edit");
        const isPhotoDept = deptNameLower.includes("photo") || deptNameLower.includes("shoot");
        const isPhotoUser = uDept.includes("photo") || uDept.includes("shoot") || uDesig.includes("photo") || uDesig.includes("shoot");

        return (
          u.departmentId === department.id ||
          uDept === deptNameLower ||
          uDept === deptCodeLower ||
          uDept.includes(deptNameLower) ||
          (isPhotoDept && isPhotoUser) ||
          (!isPhotoDept && isGraphicDept && isGraphicUser) ||
          (!isPhotoDept && isSocialDept && isSocialUser) ||
          (!isPhotoDept && isVideoDept && isVideoUser && !isPhotoUser)
        );
      });
      console.log(`Dept: ${department.name}, users matched:`, departmentUsers.map(u => u.email));
      if (departmentUsers.length > 0) return departmentUsers[0].id;
    }
    return null;
  };

  const deptId = getDepartmentId("Video Editor");
  console.log("Video Editor -> DeptID:", deptId, allDepartments.find(d => d.id === deptId)?.name);
  const owner = resolveDepartmentOwner(deptId);
  console.log("Owner:", owner, allCompanyUsers.find(u => u.id === owner)?.email);
}
main().finally(() => prisma.$disconnect());
