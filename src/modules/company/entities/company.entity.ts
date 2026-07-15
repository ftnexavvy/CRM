import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus } from "@prisma/client";

export class CompanyEntity {
  @ApiProperty() id!: string;
  @ApiProperty() companyName!: string;
  @ApiProperty() companyCode!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) website!: string | null;
  @ApiPropertyOptional({ nullable: true }) logo!: string | null;
  @ApiPropertyOptional({ nullable: true }) industry!: string | null;
  @ApiPropertyOptional({ nullable: true }) address!: string | null;
  @ApiPropertyOptional({ nullable: true }) city!: string | null;
  @ApiPropertyOptional({ nullable: true }) state!: string | null;
  @ApiPropertyOptional({ nullable: true }) country!: string | null;
  @ApiPropertyOptional({ nullable: true }) postalCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) timezone!: string | null;
  @ApiPropertyOptional({ nullable: true }) currency!: string | null;
  @ApiPropertyOptional({ nullable: true }) gstNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) panNumber!: string | null;
  @ApiProperty({ enum: CompanyStatus }) status!: CompanyStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
