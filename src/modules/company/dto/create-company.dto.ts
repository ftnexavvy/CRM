import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from "class-validator";

export class CreateCompanyDto {
  @ApiProperty({ example: "Nexavvy Digital" })
  @IsString()
  @MaxLength(150)
  companyName!: string;

  @ApiProperty({ example: "NEXAVVY" })
  @IsString()
  @Length(2, 50)
  companyCode!: string;

  @ApiProperty({ example: "hello@nexavvy.com" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: "+91-9876543210" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: "https://nexavvy.com" })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  website?: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/logo.png" })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  logo?: string;

  @ApiPropertyOptional({ example: "Marketing & Advertising" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ example: "12 MG Road" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: "Bengaluru" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: "Karnataka" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: "India" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: "560001" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: "Asia/Kolkata" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({ example: "INR" })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: "29ABCDE1234F1Z5" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  gstNumber?: string;

  @ApiPropertyOptional({ example: "ABCDE1234F" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  panNumber?: string;

  @ApiPropertyOptional({ enum: CompanyStatus, default: CompanyStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
