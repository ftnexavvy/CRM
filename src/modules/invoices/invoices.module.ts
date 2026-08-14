import { Module, forwardRef } from "@nestjs/common";
import { InvoicesController } from "./controllers/invoices.controller";
import { InvoicesService } from "./services/invoices.service";
import { PdfService } from "./services/pdf.service";
import { InvoiceEmailService } from "./services/invoice-email.service";
import { ActivityModule } from "../activity/activity.module";

@Module({
  imports: [forwardRef(() => ActivityModule)],
  controllers: [InvoicesController],
  providers: [InvoicesService, PdfService, InvoiceEmailService],
  exports: [InvoicesService, PdfService, InvoiceEmailService],
})
export class InvoicesModule {}
