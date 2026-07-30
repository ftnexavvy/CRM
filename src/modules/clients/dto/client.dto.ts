import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ClientServiceInputDto {
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @IsOptional()
  configuration?: any;
}

export class CreateClientDto {
  @ApiProperty({ example: "Nexavvy Corporation" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: "contact@nexavvy.com" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: "https://nexavvy.com" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ example: "123 Innovation Way, Suite 100" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: "Premium tier customer" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: "Array of services with their specific configurations to assign to this client during onboarding",
    type: [ClientServiceInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientServiceInputDto)
  services?: ClientServiceInputDto[];
}

export class ImportClientFromLeadDto {
  @ApiProperty({ description: "Lead ID to import data from" })
  @IsString()
  @IsNotEmpty()
  leadId!: string;

  @ApiPropertyOptional({
    description: "Services to assign during onboarding",
    type: [ClientServiceInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientServiceInputDto)
  services?: ClientServiceInputDto[];

  @ApiPropertyOptional({ example: "123 Innovation Way, Suite 100" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: "https://nexavvy.com" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional({ example: "Nexavvy Corporation" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: "contact@nexavvy.com" })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: "https://nexavvy.com" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ example: "123 Innovation Way, Suite 100" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: "Premium tier customer" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [ClientServiceInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientServiceInputDto)
  services?: ClientServiceInputDto[];
}
