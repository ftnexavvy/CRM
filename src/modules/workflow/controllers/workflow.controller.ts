import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { RequirePermissions } from "../../user/decorators/permissions.decorator";
import { PermissionsGuard } from "../../user/guards/permissions.guard";
import { AssignWorkflowDto, CreateWorkflowDto, GenerateTasksDto, WorkflowRemarksDto } from "../dto/workflow.dto";
import { WorkflowService } from "../services/workflow.service";

@ApiTags("Workflow Engine") @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller("workflows")
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}
  @Post() @RequirePermissions("Workflow.Create") @ApiOperation({ summary: "Start a workflow for a lead, client, project, or task" }) async create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkflowDto) { return this.ok("Workflow created successfully", await this.service.create(user.companyId, user.id, dto)); }
  @Get("queue/me") @RequirePermissions("Workflow.Read") @ApiOperation({ summary: "Get the current employee work queue" }) async mine(@CurrentUser() user: AuthUser) { return this.ok("Work queue retrieved successfully", await this.service.queue(user.companyId, user.id)); }
  @Get("dashboard") @RequirePermissions("Workflow.Dashboard.Read") @ApiOperation({ summary: "Group workflow workload by department and status" }) async dashboard(@CurrentUser() user: AuthUser) { return this.ok("Workflow dashboard retrieved successfully", await this.service.dashboard(user.companyId)); }
  @Get("department/:departmentId") @RequirePermissions("Workflow.Dashboard.Read") async department(@CurrentUser() user: AuthUser, @Param("departmentId") departmentId: string) { return this.ok("Department queue retrieved successfully", await this.service.departmentQueue(user.companyId, departmentId)); }
  @Get(":id/timeline") @RequirePermissions("Workflow.Read") async timeline(@CurrentUser() user: AuthUser, @Param("id") id: string) { await this.service.findOne(user.companyId, id); return this.ok("Workflow timeline retrieved successfully", await this.service.timeline(user.companyId, id)); }
  @Get(":id") @RequirePermissions("Workflow.Read") async one(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.ok("Workflow retrieved successfully", await this.service.findOne(user.companyId, id)); }
  @Post(":id/assign") @RequirePermissions("Workflow.Assign") async assign(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: AssignWorkflowDto) { return this.ok("Work assigned successfully", await this.service.assign(user.companyId, user.id, id, dto)); }
  @Post(":id/transfer") @RequirePermissions("Workflow.Transfer") async transfer(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: AssignWorkflowDto) { return this.ok("Work transferred successfully", await this.service.assign(user.companyId, user.id, id, dto, true)); }
  @Post(":id/accept") @RequirePermissions("Workflow.Accept") async accept(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.ok("Work accepted successfully", await this.service.accept(user.companyId, user.id, id)); }
  @Post(":id/reject") @RequirePermissions("Workflow.Reject") async reject(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: WorkflowRemarksDto) { return this.ok("Work rejected successfully", await this.service.reject(user.companyId, user.id, id, dto)); }
  @Post(":id/complete") @RequirePermissions("Workflow.Complete") async complete(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: WorkflowRemarksDto) { return this.ok("Work submitted for review", await this.service.complete(user.companyId, user.id, id, dto)); }
  @Post(":id/approve") @RequirePermissions("Workflow.Approve") async approve(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: WorkflowRemarksDto) { return this.ok("Workflow approved successfully", await this.service.approve(user.companyId, user.id, id, dto)); }
  @Post(":id/tasks/generate") @RequirePermissions("Task.Generate") async generateTasks(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: GenerateTasksDto) { return this.ok("Tasks generated successfully", await this.service.generateTasks(user.companyId, user.id, id, dto)); }
  private ok(message: string, data: object) { return { success: true, message, data }; }
}
