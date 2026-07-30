import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AssignmentStrategy, TaskType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateServiceDto {
  @ApiProperty({ example: "Social Media Management" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: "Manage all social media channels" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskType, default: TaskType.GENERIC })
  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @ApiPropertyOptional({ description: "User ID of the primary owner for this service" })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ description: "Department ID responsible for this service" })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description: "Ordered task template titles for this service",
    example: ["Monthly Strategy", "Content Planning", "Client Approval"],
  })
  @IsOptional()
  taskTemplates?: string[];
}

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: "Social Media Management" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: ["Website Audit", "Keyword Research", "Monthly Report"] })
  @IsOptional()
  taskTemplates?: string[];
}

export class UpdateWorkflowSettingsDto {
  @ApiPropertyOptional({ enum: AssignmentStrategy })
  @IsOptional()
  @IsEnum(AssignmentStrategy)
  assignmentStrategy?: AssignmentStrategy;
}
