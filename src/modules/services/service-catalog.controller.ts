import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/interfaces/auth-repository.interface";
import { CreateServiceDto, UpdateServiceDto, UpdateWorkflowSettingsDto } from "./dto/service.dto";
import { ServiceCatalogService } from "./services/service-catalog.service";

@ApiTags("Services")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("services")
export class ServiceCatalogController {
  constructor(private readonly svc: ServiceCatalogService) {}

  @Get()
  @ApiOperation({ summary: "List all services (admin configures, others can read for onboarding)" })
  async findAll(@CurrentUser() user: AuthUser) {
    const data = await this.svc.findAll(user.companyId);
    return { success: true, message: "Services retrieved successfully", data };
  }

  @Get("workflow/settings")
  @ApiOperation({ summary: "Get workflow automation settings" })
  async workflowSettings(@CurrentUser() user: AuthUser) {
    const data = await this.svc.getWorkflowSettings(user.companyId);
    return { success: true, message: "Workflow settings retrieved successfully", data };
  }

  @Patch("workflow/settings")
  @ApiOperation({ summary: "Update workflow automation settings" })
  async updateWorkflowSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateWorkflowSettingsDto) {
    const data = await this.svc.updateWorkflowSettings(user.companyId, dto);
    return { success: true, message: "Workflow settings updated successfully", data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get service by ID" })
  async findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const data = await this.svc.findOne(user.companyId, id);
    return { success: true, message: "Service retrieved successfully", data };
  }

  @Post()
  @ApiOperation({ summary: "Admin: Create a new service" })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceDto) {
    const data = await this.svc.create(user.companyId, dto);
    return { success: true, message: "Service created successfully", data };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Admin: Update service" })
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateServiceDto) {
    const data = await this.svc.update(user.companyId, id, dto);
    return { success: true, message: "Service updated successfully", data };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Admin: Delete service" })
  async delete(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.svc.delete(user.companyId, id);
    return { success: true, message: "Service deleted successfully" };
  }
}
