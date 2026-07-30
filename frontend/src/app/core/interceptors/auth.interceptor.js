import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
export const authInterceptor = (req, next) => {
    const authService = inject(AuthService);
    const token = authService.accessToken;
    let authReq = req;
    // Append token if user is authenticated and this is not a login/register request
    if (token &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/register') &&
        !req.url.includes('/auth/refresh')) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }
    return next(authReq).pipe(catchError((error) => {
        // Attempt token refresh on 401 Unauthorized (unless it's an auth route already)
        if (error.status === 401 &&
            !req.url.includes('/auth/login') &&
            !req.url.includes('/auth/register') &&
            !req.url.includes('/auth/refresh')) {
            return authService.refreshSession().pipe(switchMap(() => {
                const newToken = authService.accessToken;
                const retryReq = req.clone({
                    setHeaders: {
                        Authorization: `Bearer ${newToken}`
                    }
                });
                return next(retryReq);
            }), catchError((refreshErr) => {
                // Refresh failed, log out user
                authService.logout().subscribe();
                return throwError(() => refreshErr);
            }));
        }
        return throwError(() => error);
    }));
};
