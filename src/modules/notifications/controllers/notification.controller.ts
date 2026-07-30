import { Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { NotificationService } from "../services/notification.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  @ApiOperation({ summary: "Retrieve all notifications for the authenticated user" })
  async findAll(@CurrentUser() user: AuthUser) {
    const data = await this.service.findAll(user.companyId, user.id);
    return { success: true, message: "Notifications retrieved successfully", data };
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  async markAsRead(@Param("id") id: string) {
    const data = await this.service.markAsRead(id);
    return { success: true, message: "Notification marked as read successfully", data };
  }

  @Post("mark-all-read")
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllRead(@CurrentUser() user: AuthUser) {
    await this.service.markAllRead(user.companyId, user.id);
    return { success: true, message: "All notifications marked as read successfully" };
  }
}
