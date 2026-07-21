import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateDepartmentDto {
  @ApiProperty() @IsString() @Length(2, 100) name!: string;
  @ApiProperty({ example: "SOCIAL_MEDIA" }) @IsString() @Matches(/^[A-Z][A-Z0-9_]{1,49}$/) code!: string;
}
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) { @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean; }
