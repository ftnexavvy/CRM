import { BadRequestException, ConflictException, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { UserStatus } from "@prisma/client";
import { ChangePasswordDto, LoginDto, RegisterDto } from "../dto";
import { AuthDataEntity, AuthUserEntity } from "../entities/auth-response.entity";
import { AUTH_REPOSITORY, AuthUser, IAuthRepository } from "../interfaces/auth-repository.interface";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthDataEntity> {
    const existingUser = await this.authRepository.findByEmail(this.normalizeEmail(dto.email));
    if (existingUser) throw new ConflictException("An account with this email already exists");

    const password = await argon2.hash(dto.password);
    try {
      const user = await this.authRepository.createCompanyAdmin({
        ...dto,
        email: this.normalizeEmail(dto.email),
        companyEmail: this.normalizeEmail(dto.companyEmail),
        companyCode: dto.companyCode.toUpperCase(),
        password,
      });
      this.logger.log(`Registered administrator '${user.id}' for company '${user.company.id}'`);
      return this.createSession(user);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Email or company code is already in use");
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthDataEntity> {
    const user = await this.authRepository.findByEmail(this.normalizeEmail(dto.email));
    if (!user || !(await argon2.verify(user.password, dto.password))) {
      this.logger.warn(`Failed login attempt for '${this.normalizeEmail(dto.email)}'`);
      throw new UnauthorizedException("Invalid email or password");
    }
    this.assertActive(user);
    await this.authRepository.updateLastLogin(user.id);
    this.logger.log(`User '${user.id}' logged in`);
    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthDataEntity> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.authRepository.findById(payload.sub);
    if (!user || !user.refreshToken || !(await argon2.verify(user.refreshToken, refreshToken))) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    this.assertActive(user);
    return this.createSession(user);
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.updateRefreshToken(userId, null);
    this.logger.log(`User '${userId}' logged out`);
  }

  getCurrentUser(user: AuthUser): AuthUserEntity {
    return this.toUserEntity(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException("New password and confirmation do not match");
    }
    const user = await this.authRepository.findById(userId);
    if (!user || !(await argon2.verify(user.password, dto.currentPassword))) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    if (await argon2.verify(user.password, dto.newPassword)) {
      throw new BadRequestException("New password must differ from current password");
    }
    await this.authRepository.updatePassword(userId, await argon2.hash(dto.newPassword));
    this.logger.log(`Password changed for user '${userId}'`);
  }

  private async createSession(user: AuthUser): Promise<AuthDataEntity> {
    const payload: JwtPayload = { sub: user.id, email: user.email, roleId: user.roleId, companyId: user.companyId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: "15m" }),
      this.jwtService.signAsync(payload, { secret: this.refreshSecret, expiresIn: "7d" }),
    ]);
    await this.authRepository.updateRefreshToken(user.id, await argon2.hash(refreshToken));
    return { accessToken, refreshToken, user: this.toUserEntity(user) };
  }

  private get refreshSecret(): string {
    return this.configService.get<string>("JWT_REFRESH_SECRET") ?? this.configService.getOrThrow<string>("JWT_SECRET");
  }

  private assertActive(user: AuthUser): void {
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException("User account is disabled");
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }

  private toUserEntity(user: AuthUser): AuthUserEntity {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role.name,
      status: user.status,
      company: {
        id: user.company.id,
        companyName: user.company.companyName,
        companyCode: user.company.companyCode,
        status: user.company.status,
      },
    };
  }

  async verifyAccessToken(token: string): Promise<AuthUserEntity | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.authRepository.findById(payload.sub);
      if (!user) return null;
      this.assertActive(user);
      return this.toUserEntity(user);
    } catch {
      return null;
    }
  }
}
