import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { AuthUser, CreateAdminInput, IAuthRepository } from "../interfaces/auth-repository.interface";

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCompanyAdmin(input: CreateAdminInput): Promise<AuthUser> {
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          companyName: input.companyName,
          companyCode: input.companyCode,
          email: input.companyEmail,
        },
      });
      const adminRole = await tx.role.create({
        data: { companyId: company.id, name: "Administrator", description: "Company administrator", isSystemRole: true },
      });
      const permissions = await tx.permission.findMany({ select: { id: true } });
      if (permissions.length) await tx.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: adminRole.id, permissionId: permission.id })) });
      return tx.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: input.password,
          roleId: adminRole.id,
          companyId: company.id,
        },
        include: { company: true, role: { include: { permissions: { include: { permission: true } } } } },
      });
    });
  }

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { email }, include: { company: true, role: { include: { permissions: { include: { permission: true } } } } } });
  }

  findById(id: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { id }, include: { company: true, role: { include: { permissions: { include: { permission: true } } } } } });
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { refreshToken } });
  }

  async updatePassword(id: string, password: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { password, refreshToken: null } });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLogin: new Date() } });
  }
}
