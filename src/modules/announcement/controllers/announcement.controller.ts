import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { AnnouncementService } from "../services/announcement.service";
import { CreateAnnouncementDto } from "../dto/create-announcement.dto";

@ApiTags("Announcements")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("announcements")
export class AnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  @Get()
  @ApiOperation({ summary: "List latest company announcements" })
  async all(@CurrentUser() user: AuthUser) {
    return { success: true, data: await this.service.findAll(user.companyId) };
  }

  @Post()
  @ApiOperation({ summary: "Create a new announcement" })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAnnouncementDto) {
    return { success: true, message: "Announcement created", data: await this.service.create(user.companyId, user.id, dto) };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an announcement" })
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.service.remove(user.companyId, id);
    return { success: true, message: "Announcement deleted" };
  }
}
