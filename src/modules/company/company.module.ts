import { Module } from "@nestjs/common";
import { CompanyController } from "./company.controller";
import { COMPANY_REPOSITORY } from "./interfaces/company-repository.interface";
import { CompanyRepository } from "./repositories/company.repository";
import { CompanyService } from "./company.service";

@Module({
  controllers: [CompanyController],
  providers: [
    CompanyService,
    CompanyRepository,
    { provide: COMPANY_REPOSITORY, useExisting: CompanyRepository },
  ],
  exports: [CompanyService],
})
export class CompanyModule {}
