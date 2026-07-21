import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateDepartmentDto, UpdateDepartmentDto } from "../dto/department.dto";
import { PrismaService } from "../../../core/prisma/prisma.service";

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}
  findAll(companyId: string) { return this.prisma.department.findMany({ where: { companyId }, orderBy: { name: "asc" } }); }
  async create(companyId: string, dto: CreateDepartmentDto) {
    try { return await this.prisma.department.create({ data: { ...dto, code: dto.code.toUpperCase(), companyId } }); }
    catch { throw new ConflictException("A department with this name or code already exists"); }
  }
  async update(companyId: string, id: string, dto: UpdateDepartmentDto) {
    const result = await this.prisma.department.updateMany({ where: { id, companyId }, data: { ...dto, ...(dto.code ? { code: dto.code.toUpperCase() } : {}) } });
    if (!result.count) throw new NotFoundException("Department not found");
    return this.prisma.department.findFirstOrThrow({ where: { id, companyId } });
  }
}
