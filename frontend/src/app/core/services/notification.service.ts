import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient);

  all(): Observable<any> {
    return this.http.get<any>('/api/v1/notifications');
  }

  markAsRead(id: string): Observable<any> {
    return this.http.patch<any>(`/api/v1/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.post<any>('/api/v1/notifications/mark-all-read', {});
  }
}
