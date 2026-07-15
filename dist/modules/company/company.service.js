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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const company_repository_interface_1 = require("./interfaces/company-repository.interface");
let CompanyService = class CompanyService {
    constructor(companyRepository) {
        this.companyRepository = companyRepository;
    }
    async create(createCompanyDto) {
        await this.ensureCompanyCodeIsAvailable(createCompanyDto.companyCode);
        try {
            return await this.companyRepository.create(createCompanyDto);
        }
        catch (error) {
            this.rethrowUniqueCompanyCodeError(error, createCompanyDto.companyCode);
            throw error;
        }
    }
    findAll() {
        return this.companyRepository.findAll();
    }
    async findOne(id) {
        const company = await this.companyRepository.findById(id);
        if (!company)
            throw new common_1.NotFoundException(`Company with ID '${id}' was not found`);
        return company;
    }
    async update(id, updateCompanyDto) {
        const company = await this.findOne(id);
        if (updateCompanyDto.companyCode && updateCompanyDto.companyCode !== company.companyCode) {
            await this.ensureCompanyCodeIsAvailable(updateCompanyDto.companyCode);
        }
        try {
            return await this.companyRepository.update(id, updateCompanyDto);
        }
        catch (error) {
            this.rethrowUniqueCompanyCodeError(error, updateCompanyDto.companyCode);
            throw error;
        }
    }
    async remove(id) {
        await this.findOne(id);
        if (await this.companyRepository.countUsers(id)) {
            throw new common_1.ConflictException("A company with assigned users cannot be deleted");
        }
        return this.companyRepository.delete(id);
    }
    async ensureCompanyCodeIsAvailable(companyCode) {
        if (await this.companyRepository.findByCode(companyCode)) {
            throw new common_1.ConflictException(`Company code '${companyCode}' is already in use`);
        }
    }
    rethrowUniqueCompanyCodeError(error, companyCode) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new common_1.ConflictException(`Company code '${companyCode}' is already in use`);
        }
    }
};
exports.CompanyService = CompanyService;
exports.CompanyService = CompanyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(company_repository_interface_1.COMPANY_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], CompanyService);
//# sourceMappingURL=company.service.js.map