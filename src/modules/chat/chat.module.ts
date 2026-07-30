import { Module } from "@nestjs/common";
import { ChatController } from "./controllers/chat.controller";
import { ChatService } from "./services/chat.service";
import { ChatRepository } from "./repositories/chat.repository";
import { PrismaService } from "../../core/prisma/prisma.service";

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
