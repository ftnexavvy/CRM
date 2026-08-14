import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
const puppeteer = require('puppeteer');
import * as qr from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

const TEMPLATE_WIDTH_PX = 735.276;
const TEMPLATE_HEIGHT_PX = 1080;
const A4_WIDTH_PX = 793.7007874;
const A4_HEIGHT_PX = 1122.519685;
const A4_TEMPLATE_SCALE_X = A4_WIDTH_PX / TEMPLATE_WIDTH_PX;
const A4_TEMPLATE_SCALE_Y = A4_HEIGHT_PX / TEMPLATE_HEIGHT_PX;

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) {}

  async generateInvoicePdf(companyId: string, invoiceId: string): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { items: true, payments: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // 1. Generate UPI QR Code Base64
    let qrBase64 = '';
    if (invoice.companyUpiId) {
      const upiUrl = `upi://pay?pa=${invoice.companyUpiId}&pn=${encodeURIComponent(invoice.companyName)}&am=${invoice.totalAmount}&cu=INR&tn=${encodeURIComponent('Inv ' + invoice.invoiceNumber)}`;
      try {
        qrBase64 = await qr.toDataURL(upiUrl, { margin: 1, width: 200 });
      } catch (err) {
        console.error('Failed to generate UPI QR code', err);
      }
    }

    // 2. Read custom design template images from Invoice maker public folder
    let sidebarBase64 = '';
    const sidebarPath = path.join('/Users/ftnexavvy/Desktop/desktop/dixit/Invoice maker/frontend/public', '003. SWARAAN INVOICE 2026.pdf.png');
    if (fs.existsSync(sidebarPath)) {
      const sidebarBuffer = fs.readFileSync(sidebarPath);
      sidebarBase64 = `data:image/png;base64,${sidebarBuffer.toString('base64')}`;
    }

    let footerBase64 = '';
    const footerPath = path.join('/Users/ftnexavvy/Desktop/desktop/dixit/Invoice maker/frontend/public', 'footer.png');
    if (fs.existsSync(footerPath)) {
      const footerBuffer = fs.readFileSync(footerPath);
      footerBase64 = `data:image/png;base64,${footerBuffer.toString('base64')}`;
    }

    // 3. Compile HTML template (exact same template as Invoice maker)
    const htmlContent = this.compileHtmlTemplate(invoice, qrBase64, sidebarBase64, footerBase64);

    // 4. Launch Puppeteer and render PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({
        width: Math.ceil(A4_WIDTH_PX),
        height: Math.ceil(A4_HEIGHT_PX),
        deviceScaleFactor: 4,
      });

      await page.setContent(htmlContent, { waitUntil: 'load' });
      await page.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
        margin: {
          top: '0px',
          bottom: '0px',
          left: '0px',
          right: '0px',
        },
      });

      return {
        buffer: Buffer.from(pdfBuffer),
        filename: `Invoice-${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`,
      };
    } finally {
      await browser.close();
    }
  }

  private compileHtmlTemplate(invoice: any, qrBase64: string, sidebarBase64: string, footerBase64: string): string {
    const formatDate = (date: Date) => {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const d = new Date(date);
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    // Calculate rates
    const itemsRowsList = invoice.items.map((item: any) => {
      const serviceName = item.serviceName;
      const desc = item.serviceDescription ? `<div class="service-subtitle">${item.serviceDescription}</div>` : '';
      return `
        <tr class="blank-row">
          <td class="col-service">
            <div class="service-title">${serviceName}</div>
            ${desc}
          </td>
          <td class="col-sac">${item.hsnCode || '9983'}</td>
          <td class="col-qty">${item.quantity}</td>
          <td class="col-price">₹ ${item.price.toLocaleString('en-IN')}</td>
          <td class="col-amount">₹ ${item.amount.toLocaleString('en-IN')}</td>
        </tr>
      `;
    });

    const blankRowsCount = Math.max(1, 4 - invoice.items.length);
    const blankRows = Array(blankRowsCount).fill(`
      <tr class="blank-row">
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `).join('');

    const allTableRows = itemsRowsList.join('') + blankRows;

    // State tax check
    let taxRows = '';
    if (invoice.igst > 0) {
      const pct = invoice.items[0]?.gstPercentage ?? 18;
      taxRows = `
        <div class="totals-row">
          <span class="totals-label-1">IGST @ ${pct}% :</span>
          <span class="totals-value-1">₹ ${invoice.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      `;
    } else {
      const pct = (invoice.items[0]?.gstPercentage ?? 18) / 2;
      taxRows = `
        <div class="totals-row subtotal-row">
          <span class="totals-label-1">SGST @ ${pct}% :</span>
          <span class="totals-value-1">₹ ${invoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row">
          <span class="totals-label-1">CGST @ ${pct}% :</span>
          <span class="totals-value-1">₹ ${invoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Invoice - FT Nexavvy (${invoice.invoiceNumber})</title>
        <!-- Google Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet" />
        <style>
          /* Reset & Base Styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          @page {
            size: A4;
            margin: 0;
          }

          body {
            font-family: "Montserrat", "Inter", sans-serif;
            background-color: #ffffff;
            color: #333333;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .page-wrapper {
            width: 210mm;
            height: 297mm;
            overflow: hidden;
          }

          /* Main Invoice Card */
          .invoice-card {
            background: #ffffff;
            width: ${TEMPLATE_WIDTH_PX}px;
            height: ${TEMPLATE_HEIGHT_PX}px;
            box-shadow: none;
            display: grid;
            grid-template-columns: 80px 1fr;
            grid-template-rows: minmax(0, 1fr) auto;
            position: relative;
            overflow: hidden;
            transform: scale(${A4_TEMPLATE_SCALE_X}, ${A4_TEMPLATE_SCALE_Y});
            transform-origin: top left;
          }

          /* Left Sidebar Banner */
          .sidebar-banner {
            background-color: #ffffff;
            grid-row: 1 / 2;
            display: flex;
            justify-content: flex-start;
            align-items: flex-start;
            padding-top: 55px;
            user-select: none;
          }

          .invoice-sidebar-img {
            width: 80px;
            height: 525px;
            display: block;
            image-rendering: auto;
            margin-left: -2px;
          }

          /* Main Content Area */
          .main-content {
            padding: 30px 80px 15px 45px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          /* Header Section */
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
          }

          .invoice-to-section {
            max-width: 60%;
          }

          .section-heading {
            font-size: 16px;
            font-weight: 600;
            color: #333333;
            display: inline-block;
            width: 190px;
            border-bottom: 2px solid #5c5a5a;
            padding-bottom: 2px;
            margin-bottom: 16px;
          }

          .client-name {
            color: #00a3e0;
            font-weight: 550;
            font-size: 11px;
            margin-bottom: 5px;
            text-transform: uppercase;
          }

          .gst-number {
            font-weight: 500;
            font-size: 12px;
            color: #4d4d4d;
            margin-bottom: 5px;
          }

          .address {
            font-size: 12px;
            color: #505050;
            font-weight: 500;
            line-height: 1.4;
            margin-bottom: 5px;
          }

          .email {
            font-size: 12px;
            color: #4d4d4d;
            font-weight: 500;
          }

          /* Meta Details */
          .invoice-meta-section {
            text-align: right;
            padding-top: 5px;
          }

          .meta-row {
            font-size: 12px;
            margin-bottom: 12px;
            color: #444444;
          }

          .meta-label {
            font-weight: 500;
            color: #666666;
            margin-right: 6px;
          }

          .meta-value {
            font-weight: 550;
            color: #353434;
          }

          .meta-value.highlight-date {
            font-weight: 550;
            color: #3a3939;
          }

          /* Table Section */
          .table-section {
            margin-bottom: 15px;
          }

          .services-table {
            width: 100%;
            border-collapse: collapse;
          }

          .services-table th {
            color: #00a3e0;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            padding: 5px 0px;
            text-align: left;
            border-bottom: 2px solid #5d5e5f;
          }

          .services-table th.col-sac,
          .services-table th.col-qty,
          .services-table th.col-price,
          .services-table th.col-amount {
            text-align: center;
          }

          .services-table td {
            padding: 10px 5px;
            font-size: 12px;
            color: #424141;
            vertical-align: middle !important;
            border-bottom: 1px solid #e2e8f0;
          }

          .service-title {
            font-weight: 550;
            color: #222121;
          }

          .service-subtitle {
            font-size: 12px;
            color: #363535;
          }

          .col-sac,
          .col-qty,
          .col-price,
          .col-amount {
            text-align: center;
            font-weight: 500;
          }

          /* Blank rows matching template grid aesthetic */
          .services-table tr.blank-row td {
            height: 65px;
            border-bottom: 1.5px solid #b8babe;
            padding: 10px 5px;
          }

          /* Totals Section */
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 1px;
            position: relative;
          }

          .totals-table {
            width: 180px;
          }

          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 12px;
            color: #333333;
          }

          .totals-label {
            font-family: 'Inter', 'Poppins', sans-serif;
            font-weight: 600;
            color: #00a3e0;
          }

          .totals-value {
            font-weight: 600;
            color: #222222;
          }

          .subtotal-row {
            border-bottom: 1px solid #000;
            padding-bottom: 8px;
            margin-bottom: 4px;
          }

          .final-total-row {
            margin-top: 4px;
            padding-top: 8px;
            border-top: 1px solid #000;
          }

          .totals-label-1 {
            font-family: 'Inter', 'Poppins', sans-serif;
            font-weight: 500;
            font-size: 13px;
            color: #393a3a;
          }
          .totals-value-1 {
            font-weight: 600;
            font-size: 15px;
            color: #2f3030;
          }

          .totals-value.total-highlight-val {
            font-weight: 550;
            font-size: 15px;
            color: #00a3e0;
          }
          .totals-value-1.total-highlight-val {
            font-weight: 550;
            font-size: 15px;
            color: #00a3e0;
            margin-bottom: 4px;
          }

          /* Thank You Section */
          .thankyou-section {
            display: flex;
            text-align: left;
            margin-top: auto;
            gap: 10px;
            align-items: start;
          }

          .thankyou-text {
            font-size: 48px;
            font-weight: 800;
            color: #00a3e0;
            letter-spacing: 2px;
            line-height: 1;
            margin-bottom: 8px;
            position: relative;
            right: 35px;
          }
          .thankyou-text1 {
            font-family: "Poppins", sans-serif;
            font-weight: 200;
            font-style: normal;
            font-size: 48px;
            color: #00a3e0;
            letter-spacing: 2px;
            line-height: 1;
            margin-bottom: 8px;
            display: flex;
            right: 35px;
            position: relative;
          }

          .website-url {
            font-size: 15px;
            font-weight: 600;
            color: #00a3e0;
            letter-spacing: 8px;
            text-transform: lowercase;
            margin-bottom: 10px;
            right: 35px;
            position: relative;
          }

          /* Dark Blue Footer Section */
          .dark-footer {
            grid-column: 1 / 3;
            width: 100%;
            margin-top: auto;
            overflow: hidden;
            line-height: 0;
            background-color: #0c192c;
            border-top: 10px solid #00a3e0;
          }

          .footer-img {
            width: 100%;
            height: auto;
            display: block;
            image-rendering: auto;
          }

          /* Print Stylesheet */
          @media print {
            body {
              background: none;
              padding: 0;
            }

            .page-wrapper {
              max-width: 100%;
              height: 297mm;
            }

            .invoice-card {
              box-shadow: none;
              height: ${TEMPLATE_HEIGHT_PX}px;
            }
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          <div class="invoice-card">
            <!-- Left Sidebar Banner -->
            <aside class="sidebar-banner">
              <img src="${sidebarBase64}" alt="INVOICE" class="invoice-sidebar-img" />
            </aside>

            <!-- Main Content Area -->
            <div class="main-content">
              <!-- Invoice Header Details -->
              <header class="invoice-header">
                <div class="invoice-to-section">
                  <h2 class="section-heading">Invoice To:</h2>
                  <div class="client-name">${invoice.clientCompanyName}</div>
                  ${invoice.clientGstNumber ? `<div class="gst-number">${invoice.clientGstNumber}</div>` : ''}
                  <div class="address">
                    ${(invoice.clientBillingAddress || '').replace(/\n/g, '<br />')}
                  </div>
                  <div class="email">${invoice.clientEmail}</div>
                </div>

                <div class="invoice-meta-section">
                  <div class="meta-row">
                    <span class="meta-label">Invoice No:</span>
                    <span class="meta-value">${invoice.invoiceNumber}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">Invoice Date:</span>
                    <span class="meta-value highlight-date">${formatDate(invoice.invoiceDate)}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">Due Date:</span>
                    <span class="meta-value highlight-date">${formatDate(invoice.dueDate)}</span>
                  </div>
                </div>
              </header>

              <!-- Services Table -->
              <section class="table-section">
                <table class="services-table">
                  <thead>
                    <tr>
                      <th class="col-service">SERVICE NAME</th>
                      <th class="col-sac">SAC</th>
                      <th class="col-qty">QTY</th>
                      <th class="col-price">PRICE</th>
                      <th class="col-amount">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${allTableRows}
                  </tbody>
                </table>
              </section>

              <!-- Totals Section -->
              <section class="totals-section">
                <div class="totals-table">
                  <div class="totals-row subtotal-row">
                    <span class="totals-label">Sub Total</span>
                    <span class="totals-value">₹ ${invoice.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  ${taxRows}
                  <div class="totals-row final-total-row">
                    <span class="totals-label total-highlight">TOTAL</span>
                    <span class="totals-value total-highlight-val">₹ ${invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </section>

              <!-- Thank You Section -->
              <section class="thankyou-section">
                <h1 class="thankyou-text1">THANK</h1>
                <h1 class="thankyou-text">YOU</h1>
              </section>
              <div class="website-url">www.ftnexavvy.com</div>
            </div>

            <!-- Dark Blue Footer Section -->
            <footer class="dark-footer">
              <img src="${footerBase64}" alt="Footer" class="footer-img" />
            </footer>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
