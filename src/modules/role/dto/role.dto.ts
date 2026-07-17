import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateRoleDto { @ApiProperty() @IsString() name!: string; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; @ApiPropertyOptional() @IsOptional() @IsBoolean() isSystemRole?: boolean; }
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
export class UpdateRolePermissionsDto { @ApiProperty({ type: [String] }) @IsArray() @ArrayUnique() @IsString({ each: true }) permissionIds!: string[]; }
