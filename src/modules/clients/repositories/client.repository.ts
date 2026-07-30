import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";

const CLIENT_INCLUDE = {
  services: {
    include: {
      service: {
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, data: any) {
    const { services, ...rest } = data;
    const srv = services ?? [];

    return this.prisma.client.create({
      data: {
        ...rest,
        companyId,
        services: srv.length
          ? { create: srv.map((s: any) => ({ serviceId: s.serviceId, configuration: s.configuration })) }
          : undefined,
      },
      include: CLIENT_INCLUDE,
    });
  }

  async findMany(companyId: string) {
    return this.prisma.client.findMany({
      where: { companyId },
      include: CLIENT_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.client.findFirst({
      where: { id, companyId },
      include: CLIENT_INCLUDE,
    });
  }

  async update(companyId: string, id: string, data: any) {
    const { services, ...rest } = data;

    if (services !== undefined) {
      // Replace all service links
      await this.prisma.clientService.deleteMany({ where: { clientId: id } });
      if (services.length > 0) {
        await this.prisma.clientService.createMany({
          data: services.map((s: any) => ({ clientId: id, serviceId: s.serviceId, configuration: s.configuration })),
        });
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: rest,
      include: CLIENT_INCLUDE,
    });
  }

  async delete(companyId: string, id: string) {
    return this.prisma.client.delete({ where: { id } });
  }
}
