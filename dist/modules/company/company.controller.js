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
exports.CompanyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const company_service_1 = require("./company.service");
const dto_1 = require("./dto");
const company_response_entity_1 = require("./entities/company-response.entity");
let CompanyController = class CompanyController {
    constructor(companyService) {
        this.companyService = companyService;
    }
    async create(dto) {
        const data = await this.companyService.create(dto);
        return this.response(true, "Company created successfully", data);
    }
    async findAll() {
        const data = await this.companyService.findAll();
        return this.response(true, "Companies retrieved successfully", data);
    }
    async findOne(id) {
        const data = await this.companyService.findOne(id);
        return this.response(true, "Company retrieved successfully", data);
    }
    async update(id, dto) {
        const data = await this.companyService.update(id, dto);
        return this.response(true, "Company updated successfully", data);
    }
    async remove(id) {
        const data = await this.companyService.remove(id);
        return this.response(true, "Company deleted successfully", data);
    }
    response(success, message, data) {
        return { success, message, data };
    }
};
exports.CompanyController = CompanyController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: "Create a company" }),
    (0, swagger_1.ApiCreatedResponse)({ type: company_response_entity_1.CompanyResponseEntity }),
    (0, swagger_1.ApiBadRequestResponse)({ description: "Request validation failed" }),
    (0, swagger_1.ApiConflictResponse)({ description: "Company code already exists" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateCompanyDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "List companies" }),
    (0, swagger_1.ApiOkResponse)({ type: company_response_entity_1.CompanyResponseEntity, isArray: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Get a company by ID" }),
    (0, swagger_1.ApiOkResponse)({ type: company_response_entity_1.CompanyResponseEntity }),
    (0, swagger_1.ApiNotFoundResponse)({ description: "Company not found" }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Update a company" }),
    (0, swagger_1.ApiOkResponse)({ type: company_response_entity_1.CompanyResponseEntity }),
    (0, swagger_1.ApiBadRequestResponse)({ description: "Request validation failed" }),
    (0, swagger_1.ApiConflictResponse)({ description: "Company code already exists" }),
    (0, swagger_1.ApiNotFoundResponse)({ description: "Company not found" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateCompanyDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: "Delete a company" }),
    (0, swagger_1.ApiOkResponse)({ type: company_response_entity_1.CompanyResponseEntity }),
    (0, swagger_1.ApiNotFoundResponse)({ description: "Company not found" }),
    (0, swagger_1.ApiConflictResponse)({ description: "Company has assigned users" }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "remove", null);
exports.CompanyController = CompanyController = __decorate([
    (0, swagger_1.ApiTags)("Companies"),
    (0, common_1.Controller)("companies"),
    __metadata("design:paramtypes", [company_service_1.CompanyService])
], CompanyController);
//# sourceMappingURL=company.controller.js.map