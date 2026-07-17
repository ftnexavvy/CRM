import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CompanyService } from "../services/company.service";
import { CreateCompanyDto, UpdateCompanyDto } from "../dto";
import { CompanyEntity } from "../entities/company.entity";
import { CompanyResponseEntity } from "../entities/company-response.entity";

@ApiTags("Companies")
@Controller("companies")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiOperation({ summary: "Create a company" })
  @ApiCreatedResponse({ type: CompanyResponseEntity })
  @ApiBadRequestResponse({ description: "Request validation failed" })
  @ApiConflictResponse({ description: "Company code already exists" })
  async create(@Body() dto: CreateCompanyDto) {
    const data = await this.companyService.create(dto);
    return this.response(true, "Company created successfully", data);
  }

  @Get()
  @ApiOperation({ summary: "List companies" })
  @ApiOkResponse({ type: CompanyResponseEntity, isArray: true })
  async findAll() {
    const data = await this.companyService.findAll();
    return this.response(true, "Companies retrieved successfully", data);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a company by ID" })
  @ApiOkResponse({ type: CompanyResponseEntity })
  @ApiNotFoundResponse({ description: "Company not found" })
  async findOne(@Param("id") id: string) {
    const data = await this.companyService.findOne(id);
    return this.response(true, "Company retrieved successfully", data);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a company" })
  @ApiOkResponse({ type: CompanyResponseEntity })
  @ApiBadRequestResponse({ description: "Request validation failed" })
  @ApiConflictResponse({ description: "Company code already exists" })
  @ApiNotFoundResponse({ description: "Company not found" })
  async update(@Param("id") id: string, @Body() dto: UpdateCompanyDto) {
    const data = await this.companyService.update(id, dto);
    return this.response(true, "Company updated successfully", data);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a company" })
  @ApiOkResponse({ type: CompanyResponseEntity })
  @ApiNotFoundResponse({ description: "Company not found" })
  @ApiConflictResponse({ description: "Company has assigned users" })
  async remove(@Param("id") id: string) {
    const data = await this.companyService.remove(id);
    return this.response(true, "Company deleted successfully", data);
  }

  private response(success: boolean, message: string, data: CompanyEntity | CompanyEntity[]) {
    return { success, message, data };
  }
}
