import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../../../core/services/invoice.service';
import { HttpClient } from '@angular/common/http';

export interface ClientOption {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface ServiceOption {
  id: string;
  name: string;
  description?: string;
}

export interface InvoiceItemRow {
  serviceId?: string;
  serviceName: string;
  serviceDescription?: string;
  hsnCode: string;
  quantity: number;
  price: number;
  gstPercentage: number;
}

@Component({
  selector: 'app-invoice-create',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './invoice-create.html',
  styleUrls: ['./invoice-create.css']
})
export class InvoiceCreateComponent implements OnInit {
  clients = signal<ClientOption[]>([]);
  services = signal<ServiceOption[]>([]);
  selectedClientId = '';

  clientCompanyName = '';
  clientGstNumber = '';
  clientEmail = '';
  clientPhone = '';
  clientBillingAddress = '';

  invoiceDate = new Date().toISOString().split('T')[0];
  dueDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
  notes = 'Payment is due within 15 days of invoice date. Thank you for your business!';

  items: InvoiceItemRow[] = [
    { serviceId: undefined, serviceName: '', serviceDescription: '', hsnCode: '9983', quantity: 1, price: 10000, gstPercentage: 18 }
  ];

  submitting = signal<boolean>(false);

  constructor(
    private invoiceService: InvoiceService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.fetchClients();
    this.fetchServices();
  }

  fetchClients() {
    this.http.get<any>('/api/v1/clients').subscribe({
      next: (res) => {
        const clientList = Array.isArray(res) ? res : (res?.data || []);
        this.clients.set(clientList);
      },
      error: (err) => console.error('Failed to load clients', err)
    });
  }

  fetchServices() {
    this.http.get<any>('/api/v1/services').subscribe({
      next: (res) => {
        const serviceList = Array.isArray(res) ? res : (res?.data || []);
        this.services.set(serviceList);
      },
      error: (err) => console.error('Failed to load services', err)
    });
  }

  onClientSelect() {
    const client = this.clients().find(c => c.id === this.selectedClientId);
    if (client) {
      this.clientCompanyName = client.name;
      this.clientEmail = client.email;
      this.clientPhone = client.phone || '';
      this.clientBillingAddress = client.address || '';
    }
  }

  onServiceSelect(index: number, serviceIdVal: string) {
    if (!serviceIdVal) return;
    const svc = this.services().find(s => s.id === serviceIdVal);
    if (svc) {
      this.items[index].serviceId = svc.id;
      this.items[index].serviceName = svc.name;
      this.items[index].serviceDescription = svc.description || '';
    }
  }

  addItem() {
    this.items.push({
      serviceId: undefined,
      serviceName: '',
      serviceDescription: '',
      hsnCode: '9983',
      quantity: 1,
      price: 0,
      gstPercentage: 18
    });
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  calculateItemAmount(item: InvoiceItemRow): number {
    return (item.quantity || 0) * (item.price || 0);
  }

  calculateSubtotal(): number {
    return this.items.reduce((sum, item) => sum + this.calculateItemAmount(item), 0);
  }

  calculateGst(): number {
    return this.items.reduce((sum, item) => {
      const amt = this.calculateItemAmount(item);
      return sum + (amt * (item.gstPercentage || 0)) / 100;
    }, 0);
  }

  calculateTotal(): number {
    return this.calculateSubtotal() + this.calculateGst();
  }

  saveInvoice() {
    if (!this.clientCompanyName || !this.clientEmail) {
      alert('Please fill in Client Name and Email');
      return;
    }

    if (this.items.some(i => !i.serviceName || i.price <= 0)) {
      alert('Please enter a valid Service Name and Price for all line items');
      return;
    }

    this.submitting.set(true);

    const payload = {
      clientId: this.selectedClientId || undefined,
      clientCompanyName: this.clientCompanyName,
      clientGstNumber: this.clientGstNumber || undefined,
      clientEmail: this.clientEmail,
      clientPhone: this.clientPhone || undefined,
      clientBillingAddress: this.clientBillingAddress || undefined,
      invoiceDate: this.invoiceDate,
      dueDate: this.dueDate,
      notes: this.notes,
      items: this.items
    };

    this.invoiceService.createInvoice(payload).subscribe({
      next: (created) => {
        alert(`Invoice #${created.invoiceNumber} created successfully!`);
        this.router.navigate(['/invoices', created.id]);
      },
      error: (err) => {
        alert('Failed to create invoice: ' + (err.error?.message || err.message));
        this.submitting.set(false);
      }
    });
  }
}
