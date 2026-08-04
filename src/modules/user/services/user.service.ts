import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto } from "../dto/user.dto";
import { UserRepository } from "../repositories/user.repository";
import { RoleRepository } from "../../role/repositories/role.repository";

import { PrismaService } from "../../../core/prisma/prisma.service";

@Injectable()
export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getLoginHistory(companyId: string, userId: string) {
    await this.required(companyId, userId);
    return this.prisma.activityLog.findMany({
      where: {
        companyId,
        userId,
        action: { in: ["user_login", "user_logout"] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  async create(companyId: string, dto: CreateUserDto) {
    await this.assertUnique(dto.email, dto.phone);
    await this.assertRole(companyId, dto.roleId);
    const { password, ...data } = dto;
    return this.sanitize(await this.users.create({ ...data, email: dto.email.toLowerCase(), password: await argon2.hash(password), companyId }));
  }
  async findAll(companyId: string) { return (await this.users.findMany(companyId)).map((user) => this.sanitize(user)); }
  async findOne(companyId: string, id: string) { return this.sanitize(await this.required(companyId, id)); }
  async update(companyId: string, id: string, dto: UpdateUserDto) {
    await this.required(companyId, id);
    if (dto.email || dto.phone) await this.assertUnique(dto.email, dto.phone, id);
    if (dto.roleId) await this.assertRole(companyId, dto.roleId);
    const { password, ...data } = dto;
    await this.users.update(companyId, id, { ...data, ...(password ? { password: await argon2.hash(password), refreshToken: null } : {}), ...(dto.email ? { email: dto.email.toLowerCase() } : {}) });
    return this.findOne(companyId, id);
  }
  async status(companyId: string, id: string, dto: UpdateUserStatusDto) { await this.required(companyId, id); await this.users.update(companyId, id, { status: dto.status, ...(dto.status !== "ACTIVE" ? { refreshToken: null } : {}) }); return this.findOne(companyId, id); }
  async resetPassword(companyId: string, id: string, password: string) { await this.required(companyId, id); await this.users.update(companyId, id, { password: await argon2.hash(password), refreshToken: null }); }
  async remove(companyId: string, id: string) { const user = await this.required(companyId, id); if (await this.users.countByRole(user.roleId) === 1 && user.role.isSystemRole) throw new ConflictException("Cannot delete the last system-role user"); await this.users.update(companyId, id, { status: "INACTIVE", refreshToken: null }); }
  private async required(companyId: string, id: string) { const user = await this.users.findById(companyId, id); if (!user) throw new NotFoundException("User not found"); return user; }
  private async assertRole(companyId: string, roleId: string) { if (!await this.roles.findById(companyId, roleId)) throw new NotFoundException("Role not found"); }
  private async assertUnique(email?: string, phone?: string, excludeId?: string) { if (email) { const user = await this.users.findEmail(email); if (user && user.id !== excludeId) throw new ConflictException("Email already exists"); } if (phone) { const user = await this.users.findPhone(phone); if (user && user.id !== excludeId) throw new ConflictException("Phone already exists"); } }
  private sanitize(user: any) { const { password, refreshToken, ...safe } = user; return safe; }
}
