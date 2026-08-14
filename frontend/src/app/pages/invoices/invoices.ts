import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InvoiceService, Invoice } from '../../core/services/invoice.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './invoices.html',
  styleUrls: ['./invoices.css']
})
export class InvoicesComponent implements OnInit {
  invoices = signal<Invoice[]>([]);
  loading = signal<boolean>(true);
  activeTab = signal<string>('ALL');
  searchQuery = '';

  // Payment Recording Modal
  showPaymentModal = signal<boolean>(false);
  selectedInvoice = signal<Invoice | null>(null);
  paymentAmount = 0;
  paymentMode = 'UPI';
  paymentTxnId = '';
  paymentNotes = '';

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit() {
    this.loadInvoices();
  }

  loadInvoices() {
    this.loading.set(true);
    const status = this.activeTab() === 'ALL' ? undefined : this.activeTab();
    this.invoiceService.getInvoices(status).subscribe({
      next: (data) => {
        this.invoices.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading invoices:', err);
        this.loading.set(false);
      }
    });
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
    this.loadInvoices();
  }

  filteredInvoices() {
    const q = (typeof this.searchQuery === 'string' ? this.searchQuery : '').toLowerCase().trim();
    if (!q) return this.invoices();
    return this.invoices().filter(inv =>
      (inv.invoiceNumber || '').toLowerCase().includes(q) ||
      (inv.clientCompanyName || '').toLowerCase().includes(q) ||
      (inv.clientEmail || '').toLowerCase().includes(q)
    );
  }

  totalRevenue() {
    return this.invoices()
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + i.totalAmount, 0);
  }

  pendingRevenue() {
    return this.invoices()
      .filter(i => i.status === 'SENT' || i.status === 'PARTIALLY_PAID' || i.status === 'OVERDUE')
      .reduce((sum, i) => sum + i.totalAmount, 0);
  }

  downloadPdf(inv: Invoice, event: Event) {
    event.stopPropagation();
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

  sendEmail(inv: Invoice, event: Event) {
    event.stopPropagation();
    if (!confirm(`Send PDF Invoice to ${inv.clientEmail}?`)) return;
    this.invoiceService.sendEmail(inv.id).subscribe({
      next: (res) => {
        alert(res.message);
        this.loadInvoices();
      },
      error: (err) => alert('Email error: ' + err.message)
    });
  }

  sendReminder(inv: Invoice, event: Event) {
    event.stopPropagation();
    if (!confirm(`Send Payment Reminder to ${inv.clientEmail}?`)) return;
    this.invoiceService.sendReminder(inv.id).subscribe({
      next: (res) => alert(res.message),
      error: (err) => alert('Reminder error: ' + err.message)
    });
  }

  openWhatsApp(inv: Invoice, event: Event) {
    event.stopPropagation();
    this.invoiceService.getWhatsAppLink(inv.id).subscribe({
      next: (res) => {
        window.open(res.whatsappUrl, '_blank');
      },
      error: (err) => alert('WhatsApp link error: ' + err.message)
    });
  }

  openPaymentModal(inv: Invoice, event: Event) {
    event.stopPropagation();
    this.selectedInvoice.set(inv);
    const alreadyPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
    this.paymentAmount = Math.max(0, inv.totalAmount - alreadyPaid);
    this.paymentMode = 'UPI';
    this.paymentTxnId = '';
    this.paymentNotes = '';
    this.showPaymentModal.set(true);
  }

  closePaymentModal() {
    this.showPaymentModal.set(false);
    this.selectedInvoice.set(null);
  }

  submitPayment() {
    const inv = this.selectedInvoice();
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
        this.loadInvoices();
      },
      error: (err) => alert('Failed to record payment: ' + err.message)
    });
  }

  deleteInvoice(inv: Invoice, event: Event) {
    event.stopPropagation();
    if (!confirm(`Delete Invoice #${inv.invoiceNumber}? This action cannot be undone.`)) return;
    this.invoiceService.deleteInvoice(inv.id).subscribe({
      next: () => this.loadInvoices(),
      error: (err) => alert('Delete error: ' + err.message)
    });
  }
}
