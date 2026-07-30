import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { SendMessageDto } from "../dto/chat.dto";
import { ChatService } from "../services/chat.service";

@ApiTags("Live Chat")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: "Send a message to the company chatroom" })
  async sendMessage(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    const data = await this.chatService.sendMessage(user.companyId, user.id, dto);
    return { success: true, message: "Message sent successfully", data };
  }

  @Get()
  @ApiOperation({ summary: "Get the recent chat messages for the company" })
  async getMessages(@CurrentUser() user: AuthUser) {
    const data = await this.chatService.getRecentMessages(user.companyId);
    return { success: true, message: "Recent messages retrieved successfully", data };
  }
}
