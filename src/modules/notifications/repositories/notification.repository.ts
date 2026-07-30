import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, title: string, message: string) {
    return this.prisma.notification.create({
      data: {
        companyId,
        userId,
        title,
        message,
        isRead: false,
      },
    });
  }

  async findMany(companyId: string, userId: string) {
    return this.prisma.notification.findMany({
      where: { companyId, userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async updateRead(id: string, isRead: boolean) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead },
    });
  }

  async markAllAsRead(companyId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { companyId, userId, isRead: false },
      data: { isRead: true },
    });
  }
}
