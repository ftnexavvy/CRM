import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';

export interface Company {
  id: string;
  companyName: string;
  companyCode: string;
  status: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  role: any; // Can be string or full object
  status: string;
  company: Company;
  designation?: string;
  department?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Signals for state management
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly permissions = signal<string[]>([]);

  constructor() {
    setTimeout(() => this.restoreSession(), 0);
  }

  get accessToken(): string | null {
    return localStorage.getItem('crm_access_token');
  }

  get refreshToken(): string | null {
    return localStorage.getItem('crm_refresh_token');
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>('/api/v1/auth/login', credentials).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data.accessToken, res.data.refreshToken);
        }
      }),
      switchMap(() => this.loadProfile())
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>('/api/v1/auth/register', userData).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data.accessToken, res.data.refreshToken);
        }
      }),
      switchMap(() => this.loadProfile())
    );
  }

  logout(): Observable<any> {
    const clearAndRedirect = () => {
      this.clearSession();
      this.router.navigate(['/login']);
      return of({ success: true });
    };

    if (!this.accessToken) {
      return of(clearAndRedirect());
    }

    return this.http.post<any>('/api/v1/auth/logout', {}).pipe(
      catchError(() => of(null)), // Invalidate frontend session even if backend call fails
      switchMap(() => of(clearAndRedirect()))
    );
  }

  refreshSession(): Observable<any> {
    const token = this.refreshToken;
    if (!token) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<any>('/api/v1/auth/refresh', { refreshToken: token }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data.accessToken, res.data.refreshToken);
        }
      }),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  loadProfile(): Observable<any> {
    return this.http.get<any>('/api/v1/users/profile').pipe(
      tap(res => {
        if (res.success && res.data) {
          const user = res.data;
          this.currentUser.set(user);
          
          // Extract permissions from role.permissions structure
          const perms: string[] = [];
          if (user.role && typeof user.role === 'object' && user.role.permissions) {
            user.role.permissions.forEach((rp: any) => {
              if (rp.permission && rp.permission.key) {
                perms.push(rp.permission.key);
              }
            });
          }
          this.permissions.set(perms);
        }
      }),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  hasPermission(key: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    // Administrator role automatically gets all permissions
    const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
    if (roleName === 'Administrator' || roleName === 'ADMIN') return true;
    return this.permissions().includes(key);
  }

  isAdminUser(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const roleName = (typeof user.role === 'string' ? user.role : user.role?.name || '').toUpperCase();
    return ['ADMINISTRATOR', 'ADMIN'].includes(roleName);
  }

  private setSession(access: string, refresh: string): void {
    localStorage.setItem('crm_access_token', access);
    localStorage.setItem('crm_refresh_token', refresh);
  }

  private clearSession(): void {
    localStorage.removeItem('crm_access_token');
    localStorage.removeItem('crm_refresh_token');
    this.currentUser.set(null);
    this.permissions.set([]);
  }

  private restoreSession(): void {
    if (this.accessToken) {
      // Load user profile on startup if we have an access token
      this.loadProfile().subscribe({
        error: () => {
          this.clearSession();
        }
      });
    }
  }
}
