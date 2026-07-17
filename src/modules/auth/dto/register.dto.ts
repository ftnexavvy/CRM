import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "Ava" })
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiPropertyOptional({ example: "Shah" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ example: "admin@nexavvy.com" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "StrongPassword1!", minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: "password must contain uppercase, lowercase, number, and special character",
  })
  password!: string;

  @ApiProperty({ example: "Nexavvy Digital" })
  @IsString()
  @MaxLength(150)
  companyName!: string;

  @ApiProperty({ example: "NEXAVVY" })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{2,50}$/)
  companyCode!: string;

  @ApiProperty({ example: "hello@nexavvy.com" })
  @IsEmail()
  @MaxLength(255)
  companyEmail!: string;
}
