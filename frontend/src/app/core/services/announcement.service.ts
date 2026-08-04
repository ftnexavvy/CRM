import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private readonly http = inject(HttpClient);

  all(): Observable<any> {
    return this.http.get<any>('/api/v1/announcements');
  }

  create(announcement: { title: string; content: string; eventDate?: string }): Observable<any> {
    return this.http.post<any>('/api/v1/announcements', announcement);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`/api/v1/announcements/${id}`);
  }
}
