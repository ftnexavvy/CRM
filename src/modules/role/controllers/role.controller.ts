import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { RequirePermissions } from "../../user/decorators/permissions.decorator";
import { PermissionsGuard } from "../../user/guards/permissions.guard";
import { CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from "../dto/role.dto";
import { RoleService } from "../services/role.service";

@ApiTags("Roles") @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller("roles")
export class RoleController {
  constructor(private readonly service: RoleService) {}
  @Post() @RequirePermissions("Role.Create") @ApiOperation({ summary: "Create a company role" }) async create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoleDto) { return this.ok("Role created successfully", await this.service.create(user.companyId, dto)); }
  @Get() @RequirePermissions("Role.Read") @ApiOperation({ summary: "List company roles" }) async all(@CurrentUser() user: AuthUser) { return this.ok("Roles retrieved successfully", await this.service.findAll(user.companyId)); }
  @Get(":id") @RequirePermissions("Role.Read") @ApiOperation({ summary: "View a role" }) async one(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.ok("Role retrieved successfully", await this.service.findOne(user.companyId, id)); }
  @Patch(":id") @RequirePermissions("Role.Update") @ApiOperation({ summary: "Update a role" }) async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateRoleDto) { return this.ok("Role updated successfully", await this.service.update(user.companyId, id, dto)); }
  @Delete(":id") @HttpCode(HttpStatus.OK) @RequirePermissions("Role.Delete") @ApiOperation({ summary: "Delete an unassigned custom role" }) async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) { await this.service.remove(user.companyId, id); return this.ok("Role deleted successfully", {}); }
  @Get(":id/permissions") @RequirePermissions("Role.Read") @ApiOperation({ summary: "List role permissions" }) async permissions(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.ok("Role permissions retrieved successfully", await this.service.permissionsFor(user.companyId, id)); }
  @Patch(":id/permissions") @RequirePermissions("Role.Update") @ApiOperation({ summary: "Replace role permissions" }) async setPermissions(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateRolePermissionsDto) { return this.ok("Role permissions updated successfully", await this.service.setPermissions(user.companyId, id, dto)); }
  private ok(message: string, data: object) { return { success: true, message, data }; }
}
