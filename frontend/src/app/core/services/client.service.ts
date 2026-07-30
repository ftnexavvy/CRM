import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly http = inject(HttpClient);

  create(client: any): Observable<any> {
    return this.http.post<any>('/api/v1/clients', client);
  }

  importFromLead(data: { leadId: string; services?: any[]; website?: string; address?: string }): Observable<any> {
    return this.http.post<any>('/api/v1/clients/import-from-lead', data);
  }

  all(): Observable<any> {
    return this.http.get<any>('/api/v1/clients');
  }

  one(id: string): Observable<any> {
    return this.http.get<any>(`/api/v1/clients/${id}`);
  }

  update(id: string, client: any): Observable<any> {
    return this.http.patch<any>(`/api/v1/clients/${id}`, client);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`/api/v1/clients/${id}`);
  }
}
