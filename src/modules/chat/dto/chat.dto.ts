import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class SendMessageDto {
  @ApiProperty({ example: "Hello everyone!", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiProperty({ example: "/uploads/chat/document_123.pdf", required: false })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiProperty({ example: "Document.pdf", required: false })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({ example: "application/pdf", required: false })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiProperty({ example: 1048576, required: false })
  @IsOptional()
  @IsNumber()
  fileSize?: number;
}
