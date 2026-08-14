import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
} from "@nestjs/common";
import { Response } from "express";
import { InvoicesService } from "../services/invoices.service";
import { PdfService } from "../services/pdf.service";
import { InvoiceEmailService } from "../services/invoice-email.service";
import { CreateInvoiceDto, RecordPaymentDto, UpdateInvoiceDto } from "../dto/invoice.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Invoices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("invoices")
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: PdfService,
    private readonly invoiceEmailService: InvoiceEmailService
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new GST Tax Invoice" })
  async create(@Request() req: any, @Body() dto: CreateInvoiceDto) {
    const companyId = req.user.companyId;
    const actorId = req.user.id;
    return this.invoicesService.create(companyId, actorId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List company invoices with optional filters" })
  async findAll(@Request() req: any, @Query("status") status?: string, @Query("clientId") clientId?: string) {
    const companyId = req.user.companyId;
    return this.invoicesService.findAll(companyId, status, clientId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get single invoice details with line items and payment history" })
  async findOne(@Request() req: any, @Param("id") id: string) {
    const companyId = req.user.companyId;
    return this.invoicesService.findOne(companyId, id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update invoice status or details" })
  async update(@Request() req: any, @Param("id") id: string, @Body() dto: UpdateInvoiceDto) {
    const companyId = req.user.companyId;
    const actorId = req.user.id;
    return this.invoicesService.update(companyId, actorId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an invoice" })
  async delete(@Request() req: any, @Param("id") id: string) {
    const companyId = req.user.companyId;
    const actorId = req.user.id;
    return this.invoicesService.delete(companyId, actorId, id);
  }

  @Get(":id/pdf")
  @ApiOperation({ summary: "Download high-resolution PDF invoice" })
  async downloadPdf(@Request() req: any, @Param("id") id: string, @Res() res: Response) {
    const companyId = req.user.companyId;
    const { buffer, filename } = await this.pdfService.generateInvoicePdf(companyId, id);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Post(":id/send-email")
  @ApiOperation({ summary: "Send PDF Invoice directly to client via Email" })
  async sendEmail(@Request() req: any, @Param("id") id: string) {
    const companyId = req.user.companyId;
    const invoice = await this.invoicesService.findOne(companyId, id);
    const { buffer } = await this.pdfService.generateInvoicePdf(companyId, id);

    const success = await this.invoiceEmailService.sendInvoicePdfEmail(
      invoice.clientEmail,
      invoice.clientCompanyName,
      invoice.invoiceNumber,
      invoice.totalAmount,
      invoice.dueDate.toISOString(),
      buffer
    );

    if (success && invoice.status === "DRAFT") {
      await this.invoicesService.update(companyId, req.user.id, id, { status: "SENT" });
    }

    return { success, message: success ? `Invoice PDF emailed to ${invoice.clientEmail}` : "Failed to send email" };
  }

  @Post(":id/send-reminder")
  @ApiOperation({ summary: "Send payment reminder email to client" })
  async sendReminder(@Request() req: any, @Param("id") id: string) {
    const companyId = req.user.companyId;
    const invoice = await this.invoicesService.findOne(companyId, id);

    const success = await this.invoiceEmailService.sendPaymentReminderEmail(
      invoice.clientEmail,
      invoice.clientCompanyName,
      invoice.invoiceNumber,
      invoice.totalAmount,
      invoice.dueDate.toISOString()
    );

    return { success, message: success ? `Reminder email sent to ${invoice.clientEmail}` : "Failed to send reminder" };
  }

  @Get(":id/whatsapp-link")
  @ApiOperation({ summary: "Generate pre-filled WhatsApp payment reminder URL" })
  async getWhatsAppLink(@Request() req: any, @Param("id") id: string) {
    const companyId = req.user.companyId;
    const invoice = await this.invoicesService.findOne(companyId, id);

    const rawPhone = (invoice.clientPhone || "").replace(/\D/g, "");
    const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    const message = `Hi ${invoice.clientCompanyName},\nThis is a payment reminder for Invoice #${invoice.invoiceNumber} of ₹${invoice.totalAmount.toLocaleString("en-IN")}, due on ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}.\nPlease arrange the payment at your earliest convenience. Thank you!`;

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    return { whatsappUrl, message, phone: formattedPhone };
  }

  @Post(":id/payments")
  @ApiOperation({ summary: "Record a payment against an invoice" })
  async recordPayment(@Request() req: any, @Param("id") id: string, @Body() dto: RecordPaymentDto) {
    const companyId = req.user.companyId;
    const actorId = req.user.id;
    return this.invoicesService.recordPayment(companyId, actorId, id, dto);
  }
}
