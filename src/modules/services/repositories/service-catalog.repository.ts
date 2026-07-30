import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";

@Injectable()
export class ServiceCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.service.findMany({
      where: { companyId },
      include: { owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { name: "asc" },
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.service.findFirst({
      where: { id, companyId },
      include: { owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  create(companyId: string, data: any) {
    return this.prisma.service.create({
      data: { ...data, companyId },
      include: { owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  update(id: string, data: any) {
    return this.prisma.service.update({
      where: { id },
      data,
      include: { owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.service.delete({ where: { id } });
  }

  getWorkflowSettings(companyId: string) {
    return this.prisma.workflowSetting.upsert({
      where: { companyId },
      update: {},
      create: { companyId },
    });
  }

  updateWorkflowSettings(companyId: string, assignmentStrategy?: any) {
    return this.prisma.workflowSetting.upsert({
      where: { companyId },
      update: { ...(assignmentStrategy ? { assignmentStrategy } : {}) },
      create: { companyId, ...(assignmentStrategy ? { assignmentStrategy } : {}) },
    });
  }
}
