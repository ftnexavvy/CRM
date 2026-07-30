import { __decorate } from "tslib";
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, throwError, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';
let AuthService = class AuthService {
    http = inject(HttpClient);
    router = inject(Router);
    // Signals for state management
    currentUser = signal(null);
    isAuthenticated = computed(() => !!this.currentUser());
    permissions = signal([]);
    constructor() {
        setTimeout(() => this.restoreSession(), 0);
    }
    get accessToken() {
        return localStorage.getItem('crm_access_token');
    }
    get refreshToken() {
        return localStorage.getItem('crm_refresh_token');
    }
    login(credentials) {
        return this.http.post('/api/v1/auth/login', credentials).pipe(tap(res => {
            if (res.success && res.data) {
                this.setSession(res.data.accessToken, res.data.refreshToken);
            }
        }), switchMap(() => this.loadProfile()));
    }
    register(userData) {
        return this.http.post('/api/v1/auth/register', userData).pipe(tap(res => {
            if (res.success && res.data) {
                this.setSession(res.data.accessToken, res.data.refreshToken);
            }
        }), switchMap(() => this.loadProfile()));
    }
    logout() {
        const clearAndRedirect = () => {
            this.clearSession();
            this.router.navigate(['/login']);
            return of({ success: true });
        };
        if (!this.accessToken) {
            return of(clearAndRedirect());
        }
        return this.http.post('/api/v1/auth/logout', {}).pipe(catchError(() => of(null)), // Invalidate frontend session even if backend call fails
        switchMap(() => of(clearAndRedirect())));
    }
    refreshSession() {
        const token = this.refreshToken;
        if (!token) {
            this.clearSession();
            return throwError(() => new Error('No refresh token available'));
        }
        return this.http.post('/api/v1/auth/refresh', { refreshToken: token }).pipe(tap(res => {
            if (res.success && res.data) {
                this.setSession(res.data.accessToken, res.data.refreshToken);
            }
        }), catchError(err => {
            this.clearSession();
            return throwError(() => err);
        }));
    }
    loadProfile() {
        return this.http.get('/api/v1/users/profile').pipe(tap(res => {
            if (res.success && res.data) {
                const user = res.data;
                this.currentUser.set(user);
                // Extract permissions from role.permissions structure
                const perms = [];
                if (user.role && typeof user.role === 'object' && user.role.permissions) {
                    user.role.permissions.forEach((rp) => {
                        if (rp.permission && rp.permission.key) {
                            perms.push(rp.permission.key);
                        }
                    });
                }
                this.permissions.set(perms);
            }
        }), catchError(err => {
            this.clearSession();
            return throwError(() => err);
        }));
    }
    hasPermission(key) {
        const user = this.currentUser();
        if (!user)
            return false;
        // Administrator role automatically gets all permissions
        const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
        if (roleName === 'Administrator' || roleName === 'ADMIN')
            return true;
        return this.permissions().includes(key);
    }
    setSession(access, refresh) {
        localStorage.setItem('crm_access_token', access);
        localStorage.setItem('crm_refresh_token', refresh);
    }
    clearSession() {
        localStorage.removeItem('crm_access_token');
        localStorage.removeItem('crm_refresh_token');
        this.currentUser.set(null);
        this.permissions.set([]);
    }
    restoreSession() {
        if (this.accessToken) {
            // Load user profile on startup if we have an access token
            this.loadProfile().subscribe({
                error: () => {
                    this.clearSession();
                }
            });
        }
    }
};
AuthService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], AuthService);
export { AuthService };
