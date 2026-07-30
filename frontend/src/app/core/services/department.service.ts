import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private readonly http = inject(HttpClient);

  all(): Observable<any> {
    return this.http.get<any>('/api/v1/departments');
  }

  create(department: any): Observable<any> {
    return this.http.post<any>('/api/v1/departments', department);
  }

  update(id: string, department: any): Observable<any> {
    return this.http.patch<any>(`/api/v1/departments/${id}`, department);
  }
}
