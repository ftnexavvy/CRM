import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RequirePermissions } from "../../user/decorators/permissions.decorator";
import { PermissionsGuard } from "../../user/guards/permissions.guard";
import { PermissionService } from "../services/permission.service";
@ApiTags("Permissions") @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller("permissions")
export class PermissionController { constructor(private readonly service: PermissionService) {} @Get() @RequirePermissions("Permission.Read") @ApiOperation({ summary: "List the global permission catalogue" }) async all() { return { success: true, message: "Permissions retrieved successfully", data: await this.service.findAll() }; } }
