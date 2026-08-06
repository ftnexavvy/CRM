import { BadRequestException, ConflictException, Inject, Injectable, Logger, UnauthorizedException, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import * as nodemailer from "nodemailer";
import { UserStatus } from "@prisma/client";
import { ChangePasswordDto, LoginDto, RegisterDto, ResendOtpDto, VerifyOtpDto } from "../dto";
import { AuthDataEntity, AuthUserEntity } from "../entities/auth-response.entity";
import { AUTH_REPOSITORY, AuthUser, IAuthRepository } from "../interfaces/auth-repository.interface";
import { JwtPayload } from "../interfaces/jwt-payload.interface";
import { randomUUID } from "crypto";

import { ActivityService } from "../../activity/services/activity.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<string, { userId: string; otp: string; expiresAt: number }>();

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

  private mailTransporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.mailTransporter) {
      const user = (this.configService.get<string>("SMTP_USER") || "ftnexavvyprivatelimited@gmail.com").trim();
      const pass = (this.configService.get<string>("SMTP_PASS") || "slievrcotirmsasp").replace(/\s+/g, "");

      this.mailTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // Port 465 SSL is open on Render cloud firewall (unlike port 587)
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
    return this.mailTransporter;
  }

  async login(dto: LoginDto): Promise<any> {
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

    // Generate 6-Digit OTP & Temporary Session Token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tempToken = randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    this.otpStore.set(tempToken, { userId: user.id, otp, expiresAt });
    this.logger.log(`🔑 OTP generated for user '${user.email}' (${user.firstName}): ${otp}`);

    // Send real OTP email asynchronously in background so response is INSTANT (<10ms)!
    this.sendOtpEmail(user.email, otp, user.firstName).catch((err) => {
      this.logger.error(`Background OTP email delivery failed for ${user.email}: ${err}`);
    });

    const maskedEmail = this.maskEmail(user.email);

    return {
      requireOtp: true,
      tempToken,
      maskedEmail,
      devOtp: otp,
      message: `6-Digit OTP sent to your Email (${maskedEmail})`
    };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthDataEntity> {
    const entry = this.otpStore.get(dto.tempToken);
    if (!entry) {
      throw new UnauthorizedException("Session expired or invalid OTP request. Please log in again.");
    }

    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(dto.tempToken);
      throw new UnauthorizedException("OTP has expired. Please request a new OTP.");
    }

    if (entry.otp !== dto.otp.trim()) {
      throw new UnauthorizedException("Invalid 6-digit OTP code. Please check and try again.");
    }

    // OTP verified successfully! Clear OTP entry
    this.otpStore.delete(dto.tempToken);

    const user = await this.authRepository.findById(entry.userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    this.assertActive(user);

    await this.authRepository.updateLastLogin(user.id);
    this.logger.log(`User '${user.id}' verified OTP and logged in successfully`);

    await this.activityService.log(
      user.companyId,
      user.id,
      "user_login",
      `Employee ${user.firstName} ${user.lastName || ''} completed 2FA OTP login into the system`
    );

    return this.createSession(user);
  }

  async resendOtp(dto: ResendOtpDto): Promise<{ message: string; devOtp?: string }> {
    const entry = this.otpStore.get(dto.tempToken);
    if (!entry) {
      throw new UnauthorizedException("Session expired. Please log in again.");
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    entry.otp = newOtp;
    entry.expiresAt = Date.now() + 5 * 60 * 1000;
    this.otpStore.set(dto.tempToken, entry);

    const user = await this.authRepository.findById(entry.userId);
    if (user) {
      this.logger.log(`🔑 Resent OTP generated for user '${user.email}': ${newOtp}`);
      this.sendOtpEmail(user.email, newOtp, user.firstName).catch((err) => {
        this.logger.error(`Background resent OTP email failed for ${user.email}: ${err}`);
      });
    }

    return {
      message: "New 6-digit OTP has been sent to your email",
      devOtp: newOtp
    };
  }

  private async sendOtpEmail(toEmail: string, otp: string, firstName: string): Promise<boolean> {
    const user = (this.configService.get<string>("SMTP_USER") || "ftnexavvyprivatelimited@gmail.com").trim();
    const mailOptions = {
      from: `"FT Nexavvy CRM" <${user}>`,
      to: toEmail,
      subject: `🔑 ${otp} is your 2FA Login OTP Code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
          <h2 style="color: #4f46e5; margin-bottom: 8px; text-align: center;">FT Nexavvy CRM</h2>
          <p style="color: #374151; font-size: 15px;">Hello <strong>${firstName}</strong>,</p>
          <p style="color: #374151; font-size: 14px;">Your 6-digit OTP code for logging into the CRM system is:</p>
          <div style="background: #f3f4f6; padding: 18px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 34px; font-weight: bold; letter-spacing: 10px; color: #111827;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px; text-align: center;">This OTP is valid for 5 minutes. Do not share this code with anyone.</p>
        </div>
      `
    };

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail(mailOptions);
      this.logger.log(`📧 OTP email successfully sent to '${toEmail}' via Gmail SSL SMTP (Port 465)`);
      return true;
    } catch (error) {
      this.logger.warn(`Primary transporter failed for '${toEmail}', retrying with fresh connection: ${error}`);
      try {
        // Reset transporter and retry with fresh SSL connection
        this.mailTransporter = null;
        const freshTransporter = this.getTransporter();
        await freshTransporter.sendMail(mailOptions);
        this.logger.log(`📧 OTP email successfully delivered to '${toEmail}' on retry!`);
        return true;
      } catch (retryErr) {
        this.logger.error(`Failed to send OTP email to '${toEmail}' on retry: ${retryErr}`);
        return false;
      }
    }
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

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length < 2) return email;
    const [name, domain] = parts;
    const masked = name.length > 2 ? `${name.substring(0, 2)}***` : `${name[0]}*`;
    return `${masked}@${domain}`;
  }

  private maskPhone(phone: string): string {
    if (!phone) return 'Not Provided';
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return trimmed;
    const first2 = trimmed.substring(0, 2);
    const last2 = trimmed.substring(trimmed.length - 2);
    return `${first2}******${last2}`;
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
