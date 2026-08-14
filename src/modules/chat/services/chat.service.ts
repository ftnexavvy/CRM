import { Injectable, Logger } from "@nestjs/common";
import { ChatRepository } from "../repositories/chat.repository";
import { SendMessageDto } from "../dto/chat.dto";
import { AppGateway } from "../../../core/gateway/app.gateway";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly gateway: AppGateway,
  ) {}

  async sendMessage(companyId: string, senderId: string, dto: SendMessageDto) {
    this.logger.log(`User '${senderId}' is sending a chat message in company '${companyId}'`);
    const message = await this.chatRepo.createMessage(companyId, senderId, dto);
    this.gateway.emitToCompany(companyId, 'new_message', message);
    return message;
  }

  async getRecentMessages(companyId: string) {
    return this.chatRepo.getRecentMessages(companyId);
  }
}
