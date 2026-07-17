import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus, UserStatus } from "@prisma/client";

export class AuthCompanyEntity {
  @ApiProperty() id!: string;
  @ApiProperty() companyName!: string;
  @ApiProperty() companyCode!: string;
  @ApiProperty({ enum: CompanyStatus }) status!: CompanyStatus;
}

export class AuthUserEntity {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiPropertyOptional({ nullable: true }) lastName!: string | null;
  @ApiProperty() email!: string;
  @ApiProperty() role!: string;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty({ type: AuthCompanyEntity }) company!: AuthCompanyEntity;
}

export class AuthDataEntity {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ type: AuthUserEntity }) user!: AuthUserEntity;
}

export class AuthResponseEntity {
  @ApiProperty({ example: true }) success!: boolean;
  @ApiProperty() message!: string;
  @ApiProperty({ type: AuthDataEntity }) data!: AuthDataEntity;
}

export class CurrentUserResponseEntity {
  @ApiProperty({ example: true }) success!: boolean;
  @ApiProperty() message!: string;
  @ApiProperty({ type: AuthUserEntity }) data!: AuthUserEntity;
}
