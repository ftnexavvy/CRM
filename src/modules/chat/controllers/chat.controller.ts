import { Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { diskStorage } from "multer";
import * as path from "path";
import * as fs from "fs";
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

  @Post("upload")
  @ApiOperation({ summary: "Upload a document/file attachment for team chat" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(process.cwd(), "uploads", "chat");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
          cb(null, `${basename}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
    })
  )
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const relativeUrl = `/uploads/chat/${file.filename}`;
    return {
      success: true,
      message: "File uploaded successfully",
      data: {
        fileUrl: relativeUrl,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: "Get the recent chat messages for the company" })
  async getMessages(@CurrentUser() user: AuthUser) {
    const data = await this.chatService.getRecentMessages(user.companyId);
    return { success: true, message: "Recent messages retrieved successfully", data };
  }
}
