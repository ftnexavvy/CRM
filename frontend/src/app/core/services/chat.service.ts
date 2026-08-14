import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SendChatMessagePayload {
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly http = inject(HttpClient);

  getMessages(): Observable<any> {
    return this.http.get<any>('/api/v1/chat');
  }

  sendMessage(payload: string | SendChatMessagePayload): Observable<any> {
    const body = typeof payload === 'string' ? { content: payload } : payload;
    return this.http.post<any>('/api/v1/chat', body);
  }

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>('/api/v1/chat/upload', formData);
  }
}
