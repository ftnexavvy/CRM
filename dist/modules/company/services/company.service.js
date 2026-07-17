"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CompanyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const company_repository_interface_1 = require("../interfaces/company-repository.interface");
let CompanyService = CompanyService_1 = class CompanyService {
    constructor(companyRepository) {
        this.companyRepository = companyRepository;
        this.logger = new common_1.Logger(CompanyService_1.name);
    }
    async create(createCompanyDto) {
        this.logger.log(`Creating company with code '${createCompanyDto.companyCode}'`);
        await this.ensureCompanyCodeIsAvailable(createCompanyDto.companyCode);
        try {
            const company = await this.companyRepository.create(createCompanyDto);
            this.logger.log(`Created company '${company.id}'`);
            return company;
        }
        catch (error) {
            this.rethrowUniqueCompanyCodeError(error, createCompanyDto.companyCode);
            this.logger.error(`Failed to create company with code '${createCompanyDto.companyCode}'`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
    async findAll() {
        const companies = await this.companyRepository.findAll();
        this.logger.debug(`Retrieved ${companies.length} companies`);
        return companies;
    }
    async findOne(id) {
        const company = await this.companyRepository.findById(id);
        if (!company) {
            this.logger.warn(`Company '${id}' was not found`);
            throw new common_1.NotFoundException(`Company with ID '${id}' was not found`);
        }
        this.logger.debug(`Retrieved company '${id}'`);
        return company;
    }
    async update(id, updateCompanyDto) {
        this.logger.log(`Updating company '${id}'`);
        const company = await this.findOne(id);
        if (updateCompanyDto.companyCode && updateCompanyDto.companyCode !== company.companyCode) {
            await this.ensureCompanyCodeIsAvailable(updateCompanyDto.companyCode);
        }
        try {
            const updatedCompany = await this.companyRepository.update(id, updateCompanyDto);
            this.logger.log(`Updated company '${id}'`);
            return updatedCompany;
        }
        catch (error) {
            this.rethrowUniqueCompanyCodeError(error, updateCompanyDto.companyCode);
            this.logger.error(`Failed to update company '${id}'`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
    async remove(id) {
        this.logger.log(`Deleting company '${id}'`);
        await this.findOne(id);
        if (await this.companyRepository.countUsers(id)) {
            this.logger.warn(`Cannot delete company '${id}' because it has assigned users`);
            throw new common_1.ConflictException("A company with assigned users cannot be deleted");
        }
        const company = await this.companyRepository.delete(id);
        this.logger.log(`Deleted company '${id}'`);
        return company;
    }
    async ensureCompanyCodeIsAvailable(companyCode) {
        if (await this.companyRepository.findByCode(companyCode)) {
            this.logger.warn(`Company code '${companyCode}' is already in use`);
            throw new common_1.ConflictException(`Company code '${companyCode}' is already in use`);
        }
    }
    rethrowUniqueCompanyCodeError(error, companyCode) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            this.logger.warn(`Company code '${companyCode}' is already in use`);
            throw new common_1.ConflictException(`Company code '${companyCode}' is already in use`);
        }
    }
};
exports.CompanyService = CompanyService;
exports.CompanyService = CompanyService = CompanyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(company_repository_interface_1.COMPANY_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], CompanyService);
//# sourceMappingURL=company.service.js.map