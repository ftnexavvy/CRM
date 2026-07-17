import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { RequirePermissions } from "../decorators/permissions.decorator";
import { PermissionsGuard } from "../guards/permissions.guard";
import { CreateUserDto, ResetPasswordDto, UpdateUserDto, UpdateUserStatusDto } from "../dto/user.dto";
import { UserService } from "../services/user.service";

@ApiTags("Users") @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller("users")
export class UserController {
  constructor(private readonly service: UserService) {}
  @Post() @RequirePermissions("User.Create") @ApiOperation({ summary: "Create or invite an employee" }) async create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) { return this.ok("Employee created successfully", await this.service.create(user.companyId, dto)); }
  @Get() @RequirePermissions("User.Read") @ApiOperation({ summary: "List company employees" }) async all(@CurrentUser() user: AuthUser) { return this.ok("Users retrieved successfully", await this.service.findAll(user.companyId)); }
  @Get("profile") @ApiOperation({ summary: "View the authenticated employee profile" }) async profile(@CurrentUser() user: AuthUser) { return this.ok("Profile retrieved successfully", await this.service.findOne(user.companyId, user.id)); }
  @Get(":id") @RequirePermissions("User.Read") @ApiOperation({ summary: "View an employee" }) async one(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.ok("User retrieved successfully", await this.service.findOne(user.companyId, id)); }
  @Patch(":id") @RequirePermissions("User.Update") @ApiOperation({ summary: "Update an employee profile" }) async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateUserDto) { return this.ok("User updated successfully", await this.service.update(user.companyId, id, dto)); }
  @Patch(":id/status") @RequirePermissions("User.Update") @ApiOperation({ summary: "Activate, deactivate, or suspend an employee" }) async status(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateUserStatusDto) { return this.ok("User status updated successfully", await this.service.status(user.companyId, id, dto)); }
  @Patch(":id/reset-password") @RequirePermissions("User.Update") @ApiOperation({ summary: "Reset an employee password" }) async reset(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ResetPasswordDto) { await this.service.resetPassword(user.companyId, id, dto.password); return this.ok("Password reset successfully", {}); }
  @Delete(":id") @HttpCode(HttpStatus.OK) @RequirePermissions("User.Delete") @ApiOperation({ summary: "Deactivate an employee (soft delete)" }) async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) { await this.service.remove(user.companyId, id); return this.ok("User deactivated successfully", {}); }
  private ok(message: string, data: object) { return { success: true, message, data }; }
}
