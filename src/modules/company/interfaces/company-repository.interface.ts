import { Company, Prisma } from "@prisma/client";

export interface ICompanyRepository {
  create(data: Prisma.CompanyCreateInput): Promise<Company>;
  findAll(): Promise<Company[]>;
  findById(id: string): Promise<Company | null>;
  findByCode(companyCode: string): Promise<Company | null>;
  countUsers(id: string): Promise<number>;
  update(id: string, data: Prisma.CompanyUpdateInput): Promise<Company>;
  delete(id: string): Promise<Company>;
}

export const COMPANY_REPOSITORY = Symbol("COMPANY_REPOSITORY");
