import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { CreateInvoiceDto, RecordPaymentDto, UpdateInvoiceDto } from "../dto/invoice.dto";
import { numberToWords } from "../utils/number-to-words.util";
import { ActivityService } from "../../activity/services/activity.service";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService
  ) {}

  private async generateNextInvoiceNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: { companyId },
    });
    const seq = (count + 1).toString().padStart(4, "0");
    return `INV-${year}-${seq}`;
  }

  async create(companyId: string, actorId: string, dto: CreateInvoiceDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException("Company not found");

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("At least one invoice line item is required");
    }

    const invoiceNumber = await this.generateNextInvoiceNumber(companyId);

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const processedItems = dto.items.map((item) => {
      const quantity = Math.max(1, item.quantity || 1);
      const price = Math.max(0, item.price || 0);
      const amount = quantity * price;
      const gstPercentage = item.gstPercentage ?? 18.0;

      // 50-50 split for CGST and SGST
      const gstAmount = (amount * gstPercentage) / 100;
      const cgst = gstAmount / 2;
      const sgst = gstAmount / 2;
      const igst = 0;

      subtotal += amount;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      return {
        serviceId: item.serviceId || null,
        serviceName: item.serviceName,
        serviceDescription: item.serviceDescription || null,
        hsnCode: item.hsnCode || "9983",
        quantity,
        price,
        amount,
        gstPercentage,
        cgst,
        sgst,
        igst,
      };
    });

    const totalGst = totalCgst + totalSgst + totalIgst;
    const totalAmount = subtotal + totalGst;
    const amountInWordsStr = numberToWords(totalAmount);

    const invoice = await this.prisma.invoice.create({
      data: {
        companyId,
        clientId: dto.clientId || null,
        invoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: new Date(dto.dueDate),
        status: "SENT",
        subtotal,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        totalGst,
        totalAmount,
        amountInWords: amountInWordsStr,
        notes: dto.notes || null,
        isRecurring: dto.isRecurring || false,
        recurringInterval: dto.recurringInterval || null,

        // Client snapshot
        clientCompanyName: dto.clientCompanyName,
        clientGstNumber: dto.clientGstNumber || null,
        clientPan: dto.clientPan || null,
        clientEmail: dto.clientEmail,
        clientPhone: dto.clientPhone || null,
        clientBillingAddress: dto.clientBillingAddress || null,
        clientState: dto.clientState || null,
        clientStateCode: dto.clientStateCode || null,

        // Company snapshot
        companyName: company.companyName,
        companyAddress: company.address || null,
        companyEmail: company.email,
        companyPhone: company.phone || null,
        companyGstNumber: company.gstNumber || null,
        companyPan: company.panNumber || null,

        items: {
          create: processedItems,
        },
      },
      include: {
        items: true,
        client: true,
      },
    });

    // Update client's next billing date if client is linked
    if (dto.clientId) {
      await this.prisma.client.update({
        where: { id: dto.clientId },
        data: { nextBillingDate: new Date(dto.dueDate) },
      });
    }

    await this.activityService.log(
      companyId,
      actorId,
      "invoice_created",
      `Created Invoice #${invoiceNumber} for ${dto.clientCompanyName} totaling ₹${totalAmount.toLocaleString("en-IN")}`
    );

    return invoice;
  }

  async findAll(companyId: string, status?: string, clientId?: string) {
    const where: any = { companyId };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    return this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
        items: true,
        payments: true,
      },
    });
  }

  async findOne(companyId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        items: true,
        payments: { orderBy: { paymentDate: "desc" } },
      },
    });

    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async update(companyId: string, actorId: string, id: string, dto: UpdateInvoiceDto) {
    await this.findOne(companyId, id);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
      },
      include: { items: true, payments: true },
    });

    await this.activityService.log(
      companyId,
      actorId,
      "invoice_updated",
      `Updated Invoice #${updated.invoiceNumber}`
    );

    return updated;
  }

  async recordPayment(companyId: string, actorId: string, id: string, dto: RecordPaymentDto) {
    const invoice = await this.findOne(companyId, id);

    const payment = await this.prisma.invoicePayment.create({
      data: {
        invoiceId: id,
        amount: dto.amount,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        paymentMode: dto.paymentMode,
        transactionId: dto.transactionId || null,
        notes: dto.notes || null,
      },
    });

    const totalPaid = (invoice.payments.reduce((acc, p) => acc + p.amount, 0) || 0) + dto.amount;
    let newStatus = invoice.status;

    if (totalPaid >= invoice.totalAmount) {
      newStatus = "PAID";
    } else if (totalPaid > 0) {
      newStatus = "PARTIALLY_PAID";
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: newStatus },
      include: { items: true, payments: true },
    });

    // If fully paid and linked to client, advance client's nextBillingDate by 30 days
    if (newStatus === "PAID" && invoice.clientId) {
      const currentDue = invoice.dueDate ? new Date(invoice.dueDate) : new Date();
      const nextDue = new Date(currentDue.getTime() + 30 * 86400000);

      await this.prisma.client.update({
        where: { id: invoice.clientId },
        data: { nextBillingDate: nextDue },
      });
    }

    await this.activityService.log(
      companyId,
      actorId,
      "invoice_payment_recorded",
      `Recorded payment of ₹${dto.amount.toLocaleString("en-IN")} for Invoice #${invoice.invoiceNumber}. New Status: ${newStatus}`
    );

    return { payment, invoice: updatedInvoice };
  }

  async delete(companyId: string, actorId: string, id: string) {
    const invoice = await this.findOne(companyId, id);
    await this.prisma.invoice.delete({ where: { id } });

    await this.activityService.log(
      companyId,
      actorId,
      "invoice_deleted",
      `Deleted Invoice #${invoice.invoiceNumber}`
    );

    return { success: true, message: `Invoice #${invoice.invoiceNumber} deleted successfully` };
  }
}
