import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CurrentUser } from "../decorators/current-user.decorator";
import { ChangePasswordDto, LoginDto, RefreshTokenDto, RegisterDto, ResendOtpDto, VerifyOtpDto } from "../dto";
import { AuthResponseEntity, CurrentUserResponseEntity } from "../entities/auth-response.entity";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { AuthUser } from "../interfaces/auth-repository.interface";
import { AuthService } from "../services/auth.service";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a company and its first administrator" })
  @ApiCreatedResponse({ type: AuthResponseEntity })
  @ApiConflictResponse({ description: "Email or company code already exists" })
  async register(@Body() dto: RegisterDto) {
    return this.response(true, "Administrator registered successfully", await this.authService.register(dto));
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate credentials and generate OTP" })
  @ApiOkResponse({ type: AuthResponseEntity })
  @ApiUnauthorizedResponse({ description: "Invalid credentials or disabled account" })
  async login(@Body() dto: LoginDto) {
    return this.response(true, "OTP sent to email and phone number", await this.authService.login(dto));
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify 6-digit OTP and issue JWT session" })
  @ApiOkResponse({ type: AuthResponseEntity })
  @ApiUnauthorizedResponse({ description: "Invalid or expired OTP" })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.response(true, "OTP verified successfully", await this.authService.verifyOtp(dto));
  }

  @Post("resend-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend 6-digit OTP for login session" })
  @ApiOkResponse()
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.response(true, "OTP resent successfully", await this.authService.resendOtp(dto));
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate the refresh token and issue a new session" })
  @ApiOkResponse({ type: AuthResponseEntity })
  @ApiUnauthorizedResponse({ description: "Invalid or expired refresh token" })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.response(true, "Token refreshed successfully", await this.authService.refresh(dto.refreshToken));
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Invalidate the current refresh token" })
  @ApiOkResponse()
  async logout(@CurrentUser() user: AuthUser) {
    await this.authService.logout(user.companyId, user.id);
    return this.response(true, "Logout successful", {});
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user and company" })
  @ApiOkResponse({ type: CurrentUserResponseEntity })
  async me(@CurrentUser() user: AuthUser) {
    return this.response(true, "Current user retrieved successfully", this.authService.getCurrentUser(user));
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change password and invalidate active refresh token" })
  @ApiOkResponse()
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user.id, dto);
    return this.response(true, "Password changed successfully", {});
  }

  private response(success: boolean, message: string, data: object) {
    return { success, message, data };
  }
}
