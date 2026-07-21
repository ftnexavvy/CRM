import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { RequirePermissions } from "../../user/decorators/permissions.decorator";
import { PermissionsGuard } from "../../user/guards/permissions.guard";
import { AssignTaskDto, CreateTaskAttachmentDto, CreateTaskCommentDto } from "../dto/workflow.dto";
import { TaskService } from "../services/task.service";

@ApiTags("Workflow Tasks") @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller("tasks")
export class TaskController {
  constructor(private readonly service: TaskService) {}
  @Post(":id/assign") @RequirePermissions("Task.Assign") @ApiOperation({ summary: "Assign a generated task to an employee" }) async assign(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: AssignTaskDto) { return this.ok("Task assigned successfully", await this.service.assign(user.companyId, id, dto)); }
  @Post(":id/comments") @RequirePermissions("Task.Comment") async comment(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CreateTaskCommentDto) { return this.ok("Comment added successfully", await this.service.comment(user.companyId, user.id, id, dto)); }
  @Post(":id/attachments") @RequirePermissions("Task.Attach") async attach(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CreateTaskAttachmentDto) { return this.ok("Attachment added successfully", await this.service.attach(user.companyId, user.id, id, dto)); }
  private ok(message: string, data: object) { return { success: true, message, data }; }
}
