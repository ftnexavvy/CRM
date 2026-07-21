import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { RequirePermissions } from "../../user/decorators/permissions.decorator";
import { PermissionsGuard } from "../../user/guards/permissions.guard";
import { CreateDepartmentDto, UpdateDepartmentDto } from "../dto/department.dto";
import { DepartmentService } from "../services/department.service";

@ApiTags("Departments") @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller("departments")
export class DepartmentController {
  constructor(private readonly service: DepartmentService) {}
  @Get() @RequirePermissions("Department.Read") @ApiOperation({ summary: "List company departments" }) async all(@CurrentUser() user: AuthUser) { return this.ok("Departments retrieved successfully", await this.service.findAll(user.companyId)); }
  @Post() @RequirePermissions("Department.Create") @ApiOperation({ summary: "Create a department" }) async create(@CurrentUser() user: AuthUser, @Body() dto: CreateDepartmentDto) { return this.ok("Department created successfully", await this.service.create(user.companyId, dto)); }
  @Patch(":id") @RequirePermissions("Department.Update") @ApiOperation({ summary: "Update a department" }) async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateDepartmentDto) { return this.ok("Department updated successfully", await this.service.update(user.companyId, id, dto)); }
  private ok(message: string, data: object) { return { success: true, message, data }; }
}
