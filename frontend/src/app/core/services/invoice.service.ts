import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InvoiceItem {
  id?: string;
  serviceId?: string;
  serviceName: string;
  serviceDescription?: string;
  hsnCode?: string;
  quantity: number;
  price: number;
  amount: number;
  gstPercentage: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  transactionId?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  clientId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED' | 'OVERDUE';
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  totalAmount: number;
  amountInWords?: string;
  notes?: string;
  clientCompanyName: string;
  clientGstNumber?: string;
  clientPan?: string;
  clientEmail: string;
  clientPhone?: string;
  clientBillingAddress?: string;
  clientState?: string;
  clientStateCode?: string;
  companyName: string;
  companyAddress?: string;
  companyEmail: string;
  companyPhone?: string;
  companyGstNumber?: string;
  companyBankName?: string;
  companyAccountNo?: string;
  companyIfscCode?: string;
  companyUpiId?: string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = '/api/v1/invoices';

  constructor(private http: HttpClient) {}

  getInvoices(status?: string, clientId?: string): Observable<Invoice[]> {
    let params: any = {};
    if (status) params.status = status;
    if (clientId) params.clientId = clientId;
    return this.http.get<Invoice[]>(this.apiUrl, { params });
  }

  getInvoice(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/${id}`);
  }

  createInvoice(payload: any): Observable<Invoice> {
    return this.http.post<Invoice>(this.apiUrl, payload);
  }

  updateInvoice(id: string, payload: any): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.apiUrl}/${id}`, payload);
  }

  deleteInvoice(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  downloadPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  sendEmail(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${id}/send-email`, {});
  }

  sendReminder(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${id}/send-reminder`, {});
  }

  getWhatsAppLink(id: string): Observable<{ whatsappUrl: string; message: string; phone: string }> {
    return this.http.get<{ whatsappUrl: string; message: string; phone: string }>(`${this.apiUrl}/${id}/whatsapp-link`);
  }

  recordPayment(id: string, payload: { amount: number; paymentMode: string; transactionId?: string; notes?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/payments`, payload);
  }
}
