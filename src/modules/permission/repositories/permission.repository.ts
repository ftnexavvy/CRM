import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}
  findMany() { return this.prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] }); }
  countExisting(ids: string[]) { return this.prisma.permission.count({ where: { id: { in: ids } } }); }
}
