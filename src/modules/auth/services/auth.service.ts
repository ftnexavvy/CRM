import { BadRequestException, ConflictException, Inject, Injectable, Logger, UnauthorizedException, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { UserStatus } from "@prisma/client";
import { ChangePasswordDto, LoginDto, RegisterDto } from "../dto";
import { AuthDataEntity, AuthUserEntity } from "../entities/auth-response.entity";
import { AUTH_REPOSITORY, AuthUser, IAuthRepository } from "../interfaces/auth-repository.interface";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

import { ActivityService } from "../../activity/services/activity.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ActivityService)) private readonly activityService: ActivityService,
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

    // Dynamic Shift Timings Check (9:00 AM - 6:00 PM or 10:00 AM - 7:00 PM). Admins exempt.
    const roleName = (typeof user.role === 'string' ? user.role : user.role?.name || '').toUpperCase();
    const isAdmin = ['ADMINISTRATOR', 'ADMIN'].includes(roleName);
    if (!isAdmin) {
      const shiftTiming = (user as any).shiftTiming || "10:00 AM - 7:00 PM";
      const isNineToSix = shiftTiming.includes("9:00 AM") || shiftTiming.includes("9");
      const startHour = isNineToSix ? 9 : 10;
      const shiftLabel = isNineToSix ? "9:00 AM - 6:00 PM" : "10:00 AM - 7:00 PM";

      const currentHour = this.getCurrentHourIST();
      if (currentHour < startHour) {
        throw new UnauthorizedException(`Employee login is allowed only during shift hours (${shiftLabel})`);
      }
    }

    await this.authRepository.updateLastLogin(user.id);
    this.logger.log(`User '${user.id}' logged in`);

    // Log Activity with Employee Name
    await this.activityService.log(
      user.companyId,
      user.id,
      "user_login",
      `Employee ${user.firstName} ${user.lastName || ''} logged into the system`
    );

    return this.createSession(user);
  }

  async logout(companyId: string, userId: string): Promise<void> {
    const user = await this.authRepository.findById(userId);
    if (user) {
      const roleName = (typeof user.role === 'string' ? user.role : user.role?.name || '').toUpperCase();
      const isAdmin = ['ADMINISTRATOR', 'ADMIN'].includes(roleName);
      if (!isAdmin) {
        const shiftTiming = (user as any).shiftTiming || "10:00 AM - 7:00 PM";
        const isNineToSix = shiftTiming.includes("9:00 AM") || shiftTiming.includes("9");
        const endHour = isNineToSix ? 18 : 19;
        const endTimeLabel = isNineToSix ? "6:00 PM" : "7:00 PM";

        const currentHour = this.getCurrentHourIST();
        if (currentHour < endHour) {
          throw new BadRequestException(`Early logout is not allowed before ${endTimeLabel} (Shift ends at ${endTimeLabel})`);
        }
      }

      await this.activityService.log(
        companyId,
        userId,
        "user_logout",
        `Employee ${user.firstName} ${user.lastName || ''} logged out of the system`
      );
    }
    await this.authRepository.updateRefreshToken(userId, null);
    this.logger.log(`User '${userId}' logged out`);
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

  private getCurrentHourIST(): number {
    const options: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const hourStr = formatter.format(new Date());
    return parseInt(hourStr, 10) % 24;
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
