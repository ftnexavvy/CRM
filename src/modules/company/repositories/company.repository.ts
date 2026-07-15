import { Injectable } from "@nestjs/common";
import { Company, Prisma } from "@prisma/client";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { ICompanyRepository } from "../interfaces/company-repository.interface";

@Injectable()
export class CompanyRepository implements ICompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CompanyCreateInput): Promise<Company> {
    return this.prisma.company.create({ data });
  }

  findAll(): Promise<Company[]> {
    return this.prisma.company.findMany({ orderBy: { createdAt: "desc" } });
  }

  findById(id: string): Promise<Company | null> {
    return this.prisma.company.findUnique({ where: { id } });
  }

  findByCode(companyCode: string): Promise<Company | null> {
    return this.prisma.company.findUnique({ where: { companyCode } });
  }

  countUsers(id: string): Promise<number> {
    return this.prisma.user.count({ where: { companyId: id } });
  }

  update(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    return this.prisma.company.update({ where: { id }, data });
  }

  delete(id: string): Promise<Company> {
    return this.prisma.company.delete({ where: { id } });
  }
}
