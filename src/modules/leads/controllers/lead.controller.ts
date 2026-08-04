import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { CreateLeadDto, UpdateLeadDto, UpdateLeadStatusDto, AssignLeadDto, ImportContactsDto } from "../dto/lead.dto";
import { LeadService } from "../services/lead.service";
import { LeadStatus } from "@prisma/client";

@ApiTags("Leads")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("leads")
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post("import-contacts")
  @ApiOperation({ summary: "Import phone contacts in bulk from device" })
  async importContacts(@CurrentUser() user: AuthUser, @Body() dto: ImportContactsDto) {
    const data = await this.leadService.importContacts(user.companyId, user.id, dto.contacts);
    return { success: true, message: data.message, data };
  }

  @Post()
  @ApiOperation({ summary: "Create a new lead" })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
    const data = await this.leadService.create(user.companyId, user.id, dto);
    return { success: true, message: "Lead created successfully", data };
  }

  @Get()

  @ApiOperation({ summary: "Retrieve all leads" })
  @ApiQuery({ name: "status", required: false, enum: LeadStatus })
  @ApiQuery({ name: "assignedToId", required: false, type: String })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: LeadStatus,
    @Query("assignedToId") assignedToId?: string
  ) {
    const data = await this.leadService.findAll(user.companyId, status, assignedToId);
    return { success: true, message: "Leads retrieved successfully", data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get lead details by ID" })
  async findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const data = await this.leadService.findOne(user.companyId, id);
    return { success: true, message: "Lead details retrieved successfully", data };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update lead details" })
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateLeadDto) {
    const data = await this.leadService.update(user.companyId, user.id, id, dto);
    return { success: true, message: "Lead updated successfully", data };
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update lead status" })
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateLeadStatusDto
  ) {
    const data = await this.leadService.updateStatus(user.companyId, user.id, user.role.name, id, dto.status);
    return { success: true, message: "Lead status updated successfully", data };
  }

  @Patch(":id/assign")
  @ApiOperation({ summary: "Assign lead to an employee" })
  async assign(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: AssignLeadDto) {
    const data = await this.leadService.assign(user.companyId, user.id, id, dto.assignedToId);
    return { success: true, message: "Lead assigned successfully", data };
  }

  @Post(":id/convert")
  @ApiOperation({ summary: "Convert WON lead into a confirmed client" })
  async convert(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const data = await this.leadService.convert(user.companyId, user.id, id);
    return { success: true, message: "Lead converted to Client successfully", data };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete lead" })
  async delete(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.leadService.delete(user.companyId, user.id, id);
    return { success: true, message: "Lead deleted successfully" };
  }
}
