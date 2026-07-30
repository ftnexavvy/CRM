import { Injectable, Logger } from "@nestjs/common";
import { ChatRepository } from "../repositories/chat.repository";
import { SendMessageDto } from "../dto/chat.dto";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly chatRepo: ChatRepository) {}

  async sendMessage(companyId: string, senderId: string, dto: SendMessageDto) {
    this.logger.log(`User '${senderId}' is sending a chat message in company '${companyId}'`);
    return this.chatRepo.createMessage(companyId, senderId, dto.content);
  }

  async getRecentMessages(companyId: string) {
    return this.chatRepo.getRecentMessages(companyId);
  }
}
