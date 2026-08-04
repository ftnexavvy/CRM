import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { LeadStatus } from "@prisma/client";

export class CreateLeadDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: "john@example.com" })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: "Website" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ example: 1500.00 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ example: "Interested in custom software development" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: "Growth Manager @ NovaTech" })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 92 })
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiPropertyOptional({ example: "High" })
  @IsOptional()
  @IsString()
  intent?: string;

  @ApiPropertyOptional({ example: "Schedule Pricing Call" })
  @IsOptional()
  @IsString()
  nextAction?: string;

  @ApiPropertyOptional({ example: "High conversion probability" })
  @IsOptional()
  @IsString()
  aiRecommendation?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: "john@example.com" })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: "Website" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ example: 1500.00 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ example: "Interested in custom software development" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: "Growth Manager @ NovaTech" })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 92 })
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiPropertyOptional({ example: "High" })
  @IsOptional()
  @IsString()
  intent?: string;

  @ApiPropertyOptional({ example: "Schedule Pricing Call" })
  @IsOptional()
  @IsString()
  nextAction?: string;

  @ApiPropertyOptional({ example: "High conversion probability" })
  @IsOptional()
  @IsString()
  aiRecommendation?: string;
}

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus, example: LeadStatus.CONTACTED })
  @IsEnum(LeadStatus)
  status!: LeadStatus;
}

export class AssignLeadDto {
  @ApiPropertyOptional({ example: "user_cuid_here" })
  @IsOptional()
  @IsString()
  assignedToId!: string | null;
}

export class ImportedContactItemDto {
  @ApiProperty({ example: "Rahul Sharma" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: "+919876543210" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "rahul@example.com" })
  @IsOptional()
  @IsString()
  email?: string;
}

export class ImportContactsDto {
  @ApiProperty({ type: [ImportedContactItemDto] })
  contacts!: ImportedContactItemDto[];
}

