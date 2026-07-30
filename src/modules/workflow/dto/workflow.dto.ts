import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TaskType } from "@prisma/client";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from "class-validator";

export class CreateWorkflowDto {
  @ApiProperty({ example: "LEAD" }) @IsString() @Length(1, 50) subjectType!: string;
  @ApiProperty() @IsString() @Length(1, 191) subjectId!: string;
  @ApiProperty({ example: "Acme social media delivery" }) @IsString() @Length(1, 200) title!: string;
  @ApiPropertyOptional({ example: "LEAD_VERIFICATION" }) @IsOptional() @IsString() @Length(1, 80) currentStageKey?: string;
}

export class AssignWorkflowDto {
  @ApiProperty() @IsString() @Length(1, 191) assignedToId!: string;
  @ApiProperty() @IsString() @Length(1, 191) departmentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 2000) remarks?: string;
}

export class WorkflowRemarksDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 2000) remarks?: string;
}

export class GenerateTaskItemDto {
  @ApiProperty({ enum: TaskType }) @IsEnum(TaskType) type!: TaskType;
  @ApiProperty({ example: 6, minimum: 1, maximum: 500 }) @IsInt() @Min(1) @Max(500) quantity!: number;
  @ApiProperty({ example: "July graphic" }) @IsString() @Length(1, 180) titlePrefix!: string;
}

export class GenerateTasksDto {
  @ApiProperty({ type: [GenerateTaskItemDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => GenerateTaskItemDto) items!: GenerateTaskItemDto[];
}

export class AssignTaskDto { @ApiProperty() @IsString() @Length(1, 191) assignedToId!: string; }
export class CreateTaskCommentDto { @ApiProperty() @IsString() @Length(1, 5000) content!: string; }
export class CreateTaskAttachmentDto {
  @ApiProperty() @IsString() @Length(1, 255) fileName!: string;
  @ApiProperty() @IsString() @Length(1, 2000) fileUrl!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) mimeType?: string;
}
export class CreateCustomTaskDto {
  @ApiProperty({ example: "Brochure Design" }) @IsString() @Length(1, 180) title!: string;
  @ApiPropertyOptional({ enum: TaskType, default: TaskType.GENERIC }) @IsOptional() @IsEnum(TaskType) type?: TaskType;
  @ApiProperty() @IsString() @Length(1, 191) departmentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 191) assignedToId?: string;
  @ApiPropertyOptional({ example: "HIGH" }) @IsOptional() @IsString() @Length(1, 40) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 5000) description?: string;
  @ApiPropertyOptional({ example: "Ad-hoc Client Request" }) @IsOptional() @IsString() @Length(1, 150) serviceName?: string;
  @ApiPropertyOptional({ type: [CreateTaskAttachmentDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateTaskAttachmentDto) attachments?: CreateTaskAttachmentDto[];
}
