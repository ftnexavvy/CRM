import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { LeadStatus } from "@prisma/client";

@Injectable()
export class LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async transaction<T>(work: (tx: any) => Promise<T>) {
    return this.prisma.$transaction(work);
  }

  async create(companyId: string, data: any) {
    return this.prisma.lead.create({
      data: {
        ...data,
        companyId,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findMany(companyId: string, status?: LeadStatus, assignedToId?: string) {
    return this.prisma.lead.findMany({
      where: {
        companyId,
        ...(status ? { status } : {}),
        ...(assignedToId !== undefined ? { assignedToId: assignedToId || null } : {}),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.lead.findFirst({
      where: { id, companyId },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async update(companyId: string, id: string, data: any) {
    return this.prisma.lead.update({
      where: { id },
      data,
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(companyId: string, id: string) {
    return this.prisma.lead.delete({
      where: { id },
    });
  }
}
