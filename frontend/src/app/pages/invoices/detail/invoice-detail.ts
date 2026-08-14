import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InvoiceService, Invoice } from '../../../core/services/invoice.service';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './invoice-detail.html',
  styleUrls: ['./invoice-detail.css']
})
export class InvoiceDetailComponent implements OnInit {
  invoice = signal<Invoice | null>(null);
  loading = signal<boolean>(true);
  pdfLoading = signal<boolean>(true);
  pdfUrl = signal<SafeResourceUrl | null>(null);
  invoiceId = '';

  showPaymentModal = signal<boolean>(false);
  paymentAmount = 0;
  paymentMode = 'UPI';
  paymentTxnId = '';
  paymentNotes = '';

  constructor(
    private route: ActivatedRoute,
    private invoiceService: InvoiceService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.invoiceId = this.route.snapshot.paramMap.get('id') || '';
    if (this.invoiceId) {
      this.loadInvoice();
      this.loadPdfPreview();
    }
  }

  loadInvoice() {
    this.loading.set(true);
    this.invoiceService.getInvoice(this.invoiceId).subscribe({
      next: (data) => {
        this.invoice.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load invoice', err);
        this.loading.set(false);
      }
    });
  }

  loadPdfPreview() {
    this.pdfLoading.set(true);
    this.invoiceService.downloadPdf(this.invoiceId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.pdfLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load PDF preview', err);
        this.pdfLoading.set(false);
      }
    });
  }

  totalPaidAmount(): number {
    const inv = this.invoice();
    if (!inv || !inv.payments) return 0;
    return inv.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  balanceDueAmount(): number {
    const inv = this.invoice();
    if (!inv) return 0;
    return Math.max(0, inv.totalAmount - this.totalPaidAmount());
  }

  printPage() {
    window.print();
  }

  downloadPdf() {
    const inv = this.invoice();
    if (!inv) return;
    this.invoiceService.downloadPdf(inv.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${inv.invoiceNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => alert('Failed to download PDF: ' + err.message)
    });
  }

  sendEmail() {
    const inv = this.invoice();
    if (!inv) return;
    if (!confirm(`Email Tax Invoice PDF to ${inv.clientEmail}?`)) return;
    this.invoiceService.sendEmail(inv.id).subscribe({
      next: (res) => {
        alert(res.message);
        this.loadInvoice();
      },
      error: (err) => alert('Email error: ' + err.message)
    });
  }

  sendReminder() {
    const inv = this.invoice();
    if (!inv) return;
    if (!confirm(`Send Payment Reminder to ${inv.clientEmail}?`)) return;
    this.invoiceService.sendReminder(inv.id).subscribe({
      next: (res) => alert(res.message),
      error: (err) => alert('Reminder error: ' + err.message)
    });
  }

  openWhatsApp() {
    const inv = this.invoice();
    if (!inv) return;
    this.invoiceService.getWhatsAppLink(inv.id).subscribe({
      next: (res) => window.open(res.whatsappUrl, '_blank'),
      error: (err) => alert('WhatsApp link error: ' + err.message)
    });
  }

  openPaymentModal() {
    this.paymentAmount = this.balanceDueAmount();
    this.paymentMode = 'UPI';
    this.paymentTxnId = '';
    this.paymentNotes = '';
    this.showPaymentModal.set(true);
  }

  closePaymentModal() {
    this.showPaymentModal.set(false);
  }

  submitPayment() {
    const inv = this.invoice();
    if (!inv || this.paymentAmount <= 0) return;

    this.invoiceService.recordPayment(inv.id, {
      amount: this.paymentAmount,
      paymentMode: this.paymentMode,
      transactionId: this.paymentTxnId,
      notes: this.paymentNotes
    }).subscribe({
      next: () => {
        alert('Payment recorded successfully!');
        this.closePaymentModal();
        this.loadInvoice();
        this.loadPdfPreview();
      },
      error: (err) => alert('Failed to record payment: ' + err.message)
    });
  }
}
