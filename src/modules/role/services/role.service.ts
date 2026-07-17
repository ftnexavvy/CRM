import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from "../dto/role.dto";
import { RoleRepository } from "../repositories/role.repository";
import { PermissionRepository } from "../../permission/repositories/permission.repository";

@Injectable()
export class RoleService {
  constructor(private readonly roles: RoleRepository, private readonly permissions: PermissionRepository) {}
  create(companyId: string, dto: CreateRoleDto) { return this.roles.create({ ...dto, companyId }); }
  findAll(companyId: string) { return this.roles.findMany(companyId); }
  async findOne(companyId: string, id: string) { return this.required(companyId, id); }
  async update(companyId: string, id: string, dto: UpdateRoleDto) { const role = await this.required(companyId, id); if (role.isSystemRole && dto.isSystemRole === false) throw new ConflictException("System role cannot be converted"); await this.roles.update(companyId, id, dto); return this.required(companyId, id); }
  async remove(companyId: string, id: string) { const role = await this.required(companyId, id); if (role.isSystemRole) throw new ConflictException("System roles cannot be deleted"); if (role._count.users) throw new ConflictException("Role is assigned to users"); await this.roles.delete(companyId, id); }
  async permissionsFor(companyId: string, id: string) { return (await this.required(companyId, id)).permissions.map((item) => item.permission); }
  async setPermissions(companyId: string, id: string, dto: UpdateRolePermissionsDto) { await this.required(companyId, id); if (await this.permissions.countExisting(dto.permissionIds) !== dto.permissionIds.length) throw new NotFoundException("One or more permissions do not exist"); return this.roles.setPermissions(id, dto.permissionIds); }
  private async required(companyId: string, id: string) { const role = await this.roles.findById(companyId, id); if (!role) throw new NotFoundException("Role not found"); return role; }
}
