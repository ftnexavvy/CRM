import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Company, Prisma } from "@prisma/client";
import { CreateCompanyDto, UpdateCompanyDto } from "./dto";
import { COMPANY_REPOSITORY, ICompanyRepository } from "./interfaces/company-repository.interface";

@Injectable()
export class CompanyService {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: ICompanyRepository,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    await this.ensureCompanyCodeIsAvailable(createCompanyDto.companyCode);
    try {
      return await this.companyRepository.create(createCompanyDto);
    } catch (error) {
      this.rethrowUniqueCompanyCodeError(error, createCompanyDto.companyCode);
      throw error;
    }
  }

  findAll(): Promise<Company[]> {
    return this.companyRepository.findAll();
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findById(id);
    if (!company) throw new NotFoundException(`Company with ID '${id}' was not found`);
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    if (updateCompanyDto.companyCode && updateCompanyDto.companyCode !== company.companyCode) {
      await this.ensureCompanyCodeIsAvailable(updateCompanyDto.companyCode);
    }
    try {
      return await this.companyRepository.update(id, updateCompanyDto);
    } catch (error) {
      this.rethrowUniqueCompanyCodeError(error, updateCompanyDto.companyCode);
      throw error;
    }
  }

  async remove(id: string): Promise<Company> {
    await this.findOne(id);
    if (await this.companyRepository.countUsers(id)) {
      throw new ConflictException("A company with assigned users cannot be deleted");
    }
    return this.companyRepository.delete(id);
  }

  private async ensureCompanyCodeIsAvailable(companyCode: string): Promise<void> {
    if (await this.companyRepository.findByCode(companyCode)) {
      throw new ConflictException(`Company code '${companyCode}' is already in use`);
    }
  }

  private rethrowUniqueCompanyCodeError(error: unknown, companyCode?: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException(`Company code '${companyCode}' is already in use`);
    }
  }
}
