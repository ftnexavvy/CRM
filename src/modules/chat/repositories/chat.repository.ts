import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(companyId: string, senderId: string, content: string) {
    return this.prisma.chatMessage.create({
      data: {
        companyId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            designation: true,
          },
        },
      },
    });
  }

  async getRecentMessages(companyId: string, limit = 100) {
    return this.prisma.chatMessage.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            designation: true,
          },
        },
      },
    });
  }
}
