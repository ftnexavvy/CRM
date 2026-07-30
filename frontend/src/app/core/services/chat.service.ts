import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly http = inject(HttpClient);

  getMessages(): Observable<any> {
    return this.http.get<any>('/api/v1/chat');
  }

  sendMessage(content: string): Observable<any> {
    return this.http.post<any>('/api/v1/chat', { content });
  }
}
