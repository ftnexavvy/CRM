import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";

const include = { role: { include: { permissions: { include: { permission: true } } } } } as const;
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}
  findMany(companyId: string) { return this.prisma.user.findMany({ where: { companyId }, include, orderBy: { createdAt: "desc" } }); }
  findById(companyId: string, id: string) { return this.prisma.user.findFirst({ where: { id, companyId }, include }); }
  findEmail(email: string) { return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } }); }
  findPhone(phone: string) { return this.prisma.user.findUnique({ where: { phone } }); }
  create(data: any) { return this.prisma.user.create({ data, include }); }
  update(companyId: string, id: string, data: any) { return this.prisma.user.updateMany({ where: { id, companyId }, data }); }
  countByRole(roleId: string) { return this.prisma.user.count({ where: { roleId } }); }
}
