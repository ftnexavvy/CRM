import { Company, Role, User } from "@prisma/client";

export const AUTH_REPOSITORY = Symbol("AUTH_REPOSITORY");
export type AuthUser = User & {
  shiftTiming?: string | null;
  company: Company;
  role: Role & { permissions?: { permission: { key: string } }[] };
};

export interface CreateAdminInput {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  companyName: string;
  companyCode: string;
  companyEmail: string;
}

export interface IAuthRepository {
  createCompanyAdmin(input: CreateAdminInput): Promise<AuthUser>;
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  updateRefreshToken(id: string, refreshToken: string | null): Promise<void>;
  updatePassword(id: string, password: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;
}
