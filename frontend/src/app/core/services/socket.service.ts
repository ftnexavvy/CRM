import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private readonly authService = inject(AuthService);

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = this.authService.accessToken;
    if (!token) return;

    let url = 'http://localhost:3000';
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') {
        if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
          url = `http://${host}:3000`;
        } else {
          url = 'https://crm-rfyq.onrender.com';
        }
      }
    }


    this.socket = io(url, {
      query: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onEvent<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      if (!this.socket) {
        this.connect();
      }
      this.socket?.on(event, (data: T) => {
        subscriber.next(data);
      });
      return () => {
        this.socket?.off(event);
      };
    });
  }

  emit(event: string, data?: any): void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit(event, data);
  }
}

