import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);

  all(): Observable<any> {
    return this.http.get<any>('/api/v1/users');
  }

  one(id: string): Observable<any> {
    return this.http.get<any>(`/api/v1/users/${id}`);
  }

  create(user: any): Observable<any> {
    return this.http.post<any>('/api/v1/users', user);
  }

  update(id: string, user: any): Observable<any> {
    return this.http.patch<any>(`/api/v1/users/${id}`, user);
  }

  updateStatus(id: string, status: string): Observable<any> {
    return this.http.patch<any>(`/api/v1/users/${id}/status`, { status });
  }

  resetPassword(id: string, password: string): Observable<any> {
    return this.http.patch<any>(`/api/v1/users/${id}/reset-password`, { password });
  }

  getLoginHistory(id: string): Observable<any> {
    return this.http.get<any>(`/api/v1/users/${id}/login-history`);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`/api/v1/users/${id}`);
  }
}
