import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class InvoiceEmailService {
  private readonly logger = new Logger(InvoiceEmailService.name);
  private mailTransporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {}

  private getTransporter(): nodemailer.Transporter {
    if (!this.mailTransporter) {
      const user = (this.configService.get<string>("SMTP_USER") || "ftnexavvyprivatelimited@gmail.com").trim();
      const pass = (this.configService.get<string>("SMTP_PASS") || "slievrcotirmsasp").replace(/\s+/g, "");

      this.mailTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user, pass },
      });
    }
    return this.mailTransporter;
  }

  async sendInvoicePdfEmail(
    clientEmail: string,
    clientName: string,
    invoiceNumber: string,
    totalAmount: number,
    dueDate: string,
    pdfBuffer: Buffer
  ): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      const senderUser = (this.configService.get<string>("SMTP_USER") || "ftnexavvyprivatelimited@gmail.com").trim();

      const mailOptions = {
        from: `"Accounts Team" <${senderUser}>`,
        to: clientEmail,
        subject: `Invoice #${invoiceNumber} from FT NEXAVVY - Payment Due ${new Date(dueDate).toLocaleDateString("en-IN")}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="color: #ffffff; margin: 0;">TAX INVOICE ATTACHED</h2>
            </div>
            <div style="padding: 25px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
              <p>Dear <strong>${clientName}</strong>,</p>
              <p>Please find attached Tax Invoice <strong>#${invoiceNumber}</strong> for your active services.</p>
              <table style="width: 100%; background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <tr>
                  <td><strong>Invoice Number:</strong></td>
                  <td style="text-align: right;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td><strong>Total Due Amount:</strong></td>
                  <td style="text-align: right; font-size: 16px; font-weight: bold; color: #166534;">₹${totalAmount.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                  <td><strong>Due Date:</strong></td>
                  <td style="text-align: right; color: #dc2626; font-weight: bold;">${new Date(dueDate).toLocaleDateString("en-IN")}</td>
                </tr>
              </table>
              <p>Kindly arrange payment on or before the due date. The attached PDF contains complete bank transfer details and UPI QR code for fast payment.</p>
              <p style="margin-top: 30px; font-size: 13px; color: #64748b;">Best regards,<br><strong>Accounts & Billing Team</strong></p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `Invoice_${invoiceNumber.replace(/[\/\\]/g, "_")}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      };

      await transporter.sendMail(mailOptions);
      this.logger.log(`Invoice email sent successfully to ${clientEmail} for Invoice #${invoiceNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send invoice email to ${clientEmail}: ${error}`);
      return false;
    }
  }

  async sendPaymentReminderEmail(
    clientEmail: string,
    clientName: string,
    invoiceNumber: string,
    totalAmount: number,
    dueDate: string
  ): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      const senderUser = (this.configService.get<string>("SMTP_USER") || "ftnexavvyprivatelimited@gmail.com").trim();

      const mailOptions = {
        from: `"Accounts Team" <${senderUser}>`,
        to: clientEmail,
        subject: `Payment Reminder: Invoice #${invoiceNumber} Due Soon`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <div style="background-color: #ea580c; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="color: #ffffff; margin: 0;">PAYMENT REMINDER</h2>
            </div>
            <div style="padding: 25px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
              <p>Dear <strong>${clientName}</strong>,</p>
              <p>This is a gentle reminder that payment for Invoice <strong>#${invoiceNumber}</strong> is due on <strong>${new Date(dueDate).toLocaleDateString("en-IN")}</strong>.</p>
              <table style="width: 100%; background: #fff7ed; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #ffedd5;">
                <tr>
                  <td><strong>Invoice Number:</strong></td>
                  <td style="text-align: right;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td><strong>Pending Amount:</strong></td>
                  <td style="text-align: right; font-size: 16px; font-weight: bold; color: #c2410c;">₹${totalAmount.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                  <td><strong>Due Date:</strong></td>
                  <td style="text-align: right; font-weight: bold;">${new Date(dueDate).toLocaleDateString("en-IN")}</td>
                </tr>
              </table>
              <p>If you have already made the payment, please disregard this email.</p>
              <p style="margin-top: 30px; font-size: 13px; color: #64748b;">Best regards,<br><strong>Accounts & Billing Team</strong></p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      this.logger.log(`Payment reminder email sent to ${clientEmail} for Invoice #${invoiceNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send payment reminder email: ${error}`);
      return false;
    }
  }
}
