import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(companyId: string, senderId: string, payload: { content?: string; fileUrl?: string; fileName?: string; fileType?: string; fileSize?: number }) {
    return this.prisma.chatMessage.create({
      data: {
        companyId,
        senderId,
        content: payload.content || "",
        fileUrl: payload.fileUrl || null,
        fileName: payload.fileName || null,
        fileType: payload.fileType || null,
        fileSize: payload.fileSize || null,
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
