import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ServiceCatalogRepository } from "../repositories/service-catalog.repository";
import { CreateServiceDto, UpdateServiceDto, UpdateWorkflowSettingsDto } from "../dto/service.dto";

@Injectable()
export class ServiceCatalogService {
  constructor(private readonly repo: ServiceCatalogRepository) {}

  findAll(companyId: string) {
    return this.repo.findAll(companyId);
  }

  async findOne(companyId: string, id: string) {
    const svc = await this.repo.findById(companyId, id);
    if (!svc) throw new NotFoundException("Service not found");
    return svc;
  }

  async create(companyId: string, dto: CreateServiceDto) {
    return this.repo.create(companyId, this.normalizeServiceData(dto));
  }

  async update(companyId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(companyId, id);
    return this.repo.update(id, this.normalizeServiceData(dto));
  }

  async delete(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.repo.delete(id);
  }

  getWorkflowSettings(companyId: string) {
    return this.repo.getWorkflowSettings(companyId);
  }

  updateWorkflowSettings(companyId: string, dto: UpdateWorkflowSettingsDto) {
    return this.repo.updateWorkflowSettings(companyId, dto.assignmentStrategy);
  }

  private normalizeServiceData(dto: CreateServiceDto | UpdateServiceDto) {
    const data: any = { ...dto };
    if ("taskTemplates" in data && Array.isArray(data.taskTemplates)) {
      data.taskTemplates = data.taskTemplates.map((item: string) => item.trim()).filter(Boolean);
    }
    if ("departmentId" in data && data.departmentId === "") data.departmentId = null;
    if ("ownerId" in data && data.ownerId === "") data.ownerId = null;
    return data;
  }
}
