import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class JustdialLeadDto {
  @ApiPropertyOptional({ example: "Rahul Sharma", description: "Customer name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "Rahul Sharma", description: "Customer full name" })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ example: "Rahul Sharma", description: "Customer name variation" })
  @IsOptional()
  @IsString()
  customer_name?: string;

  @ApiPropertyOptional({ example: "+919876543210", description: "Mobile number" })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ example: "9876543210", description: "Phone number" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "9876543210", description: "Phone number variation" })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ example: "rahul@example.com", description: "Email address" })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: "Need Web Design & CRM Software", description: "Requirement details" })
  @IsOptional()
  @IsString()
  requirement?: string;

  @ApiPropertyOptional({ example: "Looking for marketing services", description: "Message" })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: "Mumbai", description: "City" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "Andheri West, Mumbai", description: "Location" })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: "JUSTDIAL", description: "Lead source" })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: "JD-987654321", description: "Justdial Unique Lead ID" })
  @IsOptional()
  @IsString()
  lead_id?: string;

  @ApiPropertyOptional({ example: "2026-08-14 10:00:00", description: "Lead creation timestamp" })
  @IsOptional()
  @IsString()
  created_at?: string;

  @ApiPropertyOptional({ example: "company_cuid_123", description: "Target Company ID override" })
  @IsOptional()
  @IsString()
  companyId?: string;

  [key: string]: any;
}
