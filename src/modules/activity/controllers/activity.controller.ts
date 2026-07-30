import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { ActivityService } from "../services/activity.service";

@ApiTags("Activity Logs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("activity")
export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  @Get()
  @ApiOperation({ summary: "Retrieve recent activity logs" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findAll(@CurrentUser() user: AuthUser, @Query("limit") limit?: number) {
    const data = await this.service.findAll(user.companyId, limit ? Number(limit) : undefined);
    return { success: true, message: "Activity logs retrieved successfully", data };
  }
}
