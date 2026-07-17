import { ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Company, Prisma } from "@prisma/client";
import { CreateCompanyDto, UpdateCompanyDto } from "../dto";
import { COMPANY_REPOSITORY, ICompanyRepository } from "../interfaces/company-repository.interface";

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: ICompanyRepository,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    this.logger.log(`Creating company with code '${createCompanyDto.companyCode}'`);
    await this.ensureCompanyCodeIsAvailable(createCompanyDto.companyCode);
    try {
      const company = await this.companyRepository.create(createCompanyDto);
      this.logger.log(`Created company '${company.id}'`);
      return company;
    } catch (error) {
      this.rethrowUniqueCompanyCodeError(error, createCompanyDto.companyCode);
      this.logger.error(`Failed to create company with code '${createCompanyDto.companyCode}'`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async findAll(): Promise<Company[]> {
    const companies = await this.companyRepository.findAll();
    this.logger.debug(`Retrieved ${companies.length} companies`);
    return companies;
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findById(id);
    if (!company) {
      this.logger.warn(`Company '${id}' was not found`);
      throw new NotFoundException(`Company with ID '${id}' was not found`);
    }
    this.logger.debug(`Retrieved company '${id}'`);
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    this.logger.log(`Updating company '${id}'`);
    const company = await this.findOne(id);
    if (updateCompanyDto.companyCode && updateCompanyDto.companyCode !== company.companyCode) {
      await this.ensureCompanyCodeIsAvailable(updateCompanyDto.companyCode);
    }
    try {
      const updatedCompany = await this.companyRepository.update(id, updateCompanyDto);
      this.logger.log(`Updated company '${id}'`);
      return updatedCompany;
    } catch (error) {
      this.rethrowUniqueCompanyCodeError(error, updateCompanyDto.companyCode);
      this.logger.error(`Failed to update company '${id}'`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async remove(id: string): Promise<Company> {
    this.logger.log(`Deleting company '${id}'`);
    await this.findOne(id);
    if (await this.companyRepository.countUsers(id)) {
      this.logger.warn(`Cannot delete company '${id}' because it has assigned users`);
      throw new ConflictException("A company with assigned users cannot be deleted");
    }
    const company = await this.companyRepository.delete(id);
    this.logger.log(`Deleted company '${id}'`);
    return company;
  }

  private async ensureCompanyCodeIsAvailable(companyCode: string): Promise<void> {
    if (await this.companyRepository.findByCode(companyCode)) {
      this.logger.warn(`Company code '${companyCode}' is already in use`);
      throw new ConflictException(`Company code '${companyCode}' is already in use`);
    }
  }

  private rethrowUniqueCompanyCodeError(error: unknown, companyCode?: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      this.logger.warn(`Company code '${companyCode}' is already in use`);
      throw new ConflictException(`Company code '${companyCode}' is already in use`);
    }
  }
}
