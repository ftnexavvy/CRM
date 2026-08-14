import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class InvoiceItemDto {
  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsString()
  serviceName!: string;

  @IsOptional()
  @IsString()
  serviceDescription?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsNumber()
  gstPercentage?: number;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsString()
  clientCompanyName!: string;

  @IsOptional()
  @IsString()
  clientGstNumber?: string;

  @IsOptional()
  @IsString()
  clientPan?: string;

  @IsString()
  clientEmail!: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  clientBillingAddress?: string;

  @IsOptional()
  @IsString()
  clientState?: string;

  @IsOptional()
  @IsString()
  clientStateCode?: string;

  @IsDateString()
  invoiceDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurringInterval?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class RecordPaymentDto {
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsString()
  paymentMode!: string; // UPI, BANK_TRANSFER, CASH, CHEQUE, ONLINE

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
