import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, Length, Matches } from "class-validator";
import { UserStatus } from "@prisma/client";

export class CreateUserDto {
  @ApiProperty() @IsString() firstName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\+?[0-9]{7,15}$/) phone?: string;
  @ApiProperty() @IsString() @Length(8, 128) password!: string;
  @ApiProperty() @IsString() roleId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() profileImage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shiftTiming?: string;
}
export class UpdateUserDto extends PartialType(CreateUserDto) {}
export class UpdateUserStatusDto { @ApiProperty({ enum: UserStatus }) @IsEnum(UserStatus) status!: UserStatus; }
export class ResetPasswordDto { @ApiProperty() @IsString() @Length(8, 128) password!: string; }
