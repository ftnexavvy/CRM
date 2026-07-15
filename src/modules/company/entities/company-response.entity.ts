import { ApiProperty } from "@nestjs/swagger";
import { CompanyEntity } from "./company.entity";

export class CompanyResponseEntity {
  @ApiProperty({ example: true }) success!: boolean;
  @ApiProperty({ example: "Company created successfully" }) message!: string;
  @ApiProperty({ type: CompanyEntity }) data!: CompanyEntity;
}
