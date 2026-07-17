import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
const include = { permissions: { include: { permission: true } }, _count: { select: { users: true } } } as const;
@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}
  findMany(companyId: string) { return this.prisma.role.findMany({ where: { companyId }, include, orderBy: { name: "asc" } }); }
  findById(companyId: string, id: string) { return this.prisma.role.findFirst({ where: { id, companyId }, include }); }
  create(data: any) { return this.prisma.role.create({ data, include }); }
  update(companyId: string, id: string, data: any) { return this.prisma.role.updateMany({ where: { id, companyId }, data }); }
  delete(companyId: string, id: string) { return this.prisma.role.deleteMany({ where: { id, companyId } }); }
  setPermissions(roleId: string, permissionIds: string[]) { return this.prisma.$transaction(async (tx) => { await tx.rolePermission.deleteMany({ where: { roleId } }); if (permissionIds.length) await tx.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId, permissionId })) }); return tx.role.findUniqueOrThrow({ where: { id: roleId }, include }); }); }
}
