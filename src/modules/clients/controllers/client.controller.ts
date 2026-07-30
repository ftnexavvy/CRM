import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";
import { CreateClientDto, ImportClientFromLeadDto, UpdateClientDto } from "../dto/client.dto";
import { ClientService } from "../services/client.service";

@ApiTags("Clients")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("clients")
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @ApiOperation({ summary: "Create a new client (with optional service selection)" })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateClientDto) {
    const data = await this.clientService.create(user.companyId, user.id, dto);
    return { success: true, message: "Client created successfully", data };
  }

  @Post("import-from-lead")
  @ApiOperation({ summary: "Import a lead as a client with service selection" })
  async importFromLead(@CurrentUser() user: AuthUser, @Body() dto: ImportClientFromLeadDto) {
    const data = await this.clientService.importFromLead(user.companyId, user.id, dto);
    return { success: true, message: "Lead imported as client successfully", data };
  }

  @Get()
  @ApiOperation({ summary: "Retrieve all clients" })
  async findAll(@CurrentUser() user: AuthUser) {
    const data = await this.clientService.findAll(user.companyId);
    return { success: true, message: "Clients retrieved successfully", data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get client details by ID" })
  async findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const data = await this.clientService.findOne(user.companyId, id);
    return { success: true, message: "Client details retrieved successfully", data };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update client details (including services)" })
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateClientDto) {
    const data = await this.clientService.update(user.companyId, user.id, id, dto);
    return { success: true, message: "Client updated successfully", data };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete client" })
  async delete(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.clientService.delete(user.companyId, id);
    return { success: true, message: "Client deleted successfully" };
  }
}
