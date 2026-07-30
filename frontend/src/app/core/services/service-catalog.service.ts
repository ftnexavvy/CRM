import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ServiceCatalogService {
  private readonly http = inject(HttpClient);

  all(): Observable<any> {
    return this.http.get<any>('/api/v1/services');
  }

  one(id: string): Observable<any> {
    return this.http.get<any>(`/api/v1/services/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>('/api/v1/services', data);
  }

  update(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`/api/v1/services/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`/api/v1/services/${id}`);
  }

  workflowSettings(): Observable<any> {
    return this.http.get<any>('/api/v1/services/workflow/settings');
  }

  updateWorkflowSettings(data: { assignmentStrategy: string }): Observable<any> {
    return this.http.patch<any>('/api/v1/services/workflow/settings', data);
  }
}
