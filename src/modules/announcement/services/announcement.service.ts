import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { CreateAnnouncementDto } from "../dto/create-announcement.dto";

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.announcement.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async create(companyId: string, actorId: string, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        companyId,
        createdById: actorId,
        title: dto.title,
        content: dto.content,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
      },
    });
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.announcement.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException("Announcement not found");
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }
}
