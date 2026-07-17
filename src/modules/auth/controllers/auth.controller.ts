import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CurrentUser } from "../decorators/current-user.decorator";
import { ChangePasswordDto, LoginDto, RefreshTokenDto, RegisterDto } from "../dto";
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
  @ApiOperation({ summary: "Authenticate and create a token session" })
  @ApiOkResponse({ type: AuthResponseEntity })
  @ApiUnauthorizedResponse({ description: "Invalid credentials or disabled account" })
  async login(@Body() dto: LoginDto) {
    return this.response(true, "Login successful", await this.authService.login(dto));
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
    await this.authService.logout(user.id);
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
