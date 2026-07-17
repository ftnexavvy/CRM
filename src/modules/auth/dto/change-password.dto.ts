import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: "StrongPassword1!" })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: "NewStrongPassword1!", minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: "newPassword must contain uppercase, lowercase, number, and special character",
  })
  newPassword!: string;

  @ApiProperty({ example: "NewStrongPassword1!" })
  @IsString()
  confirmPassword!: string;
}
