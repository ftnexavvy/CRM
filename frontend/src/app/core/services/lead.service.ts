import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private readonly http = inject(HttpClient);

  create(lead: any): Observable<any> {
    return this.http.post<any>('/api/v1/leads', lead);
  }

  all(status?: string, assignedToId?: string): Observable<any> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (assignedToId) {
      params = params.set('assignedToId', assignedToId);
    }
    return this.http.get<any>('/api/v1/leads', { params });
  }

  one(id: string): Observable<any> {
    return this.http.get<any>(`/api/v1/leads/${id}`);
  }

  update(id: string, lead: any): Observable<any> {
    return this.http.patch<any>(`/api/v1/leads/${id}`, lead);
  }

  updateStatus(id: string, status: string): Observable<any> {
    return this.http.patch<any>(`/api/v1/leads/${id}/status`, { status });
  }

  assign(id: string, assignedToId: string | null): Observable<any> {
    return this.http.patch<any>(`/api/v1/leads/${id}/assign`, { assignedToId });
  }

  convert(id: string): Observable<any> {
    return this.http.post<any>(`/api/v1/leads/${id}/convert`, {});
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`/api/v1/leads/${id}`);
  }

  importContacts(contacts: any[]): Observable<any> {
    return this.http.post<any>('/api/v1/leads/import-contacts', { contacts });
  }
}

