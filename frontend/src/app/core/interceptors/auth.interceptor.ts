import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token = authService.accessToken;

  // Prepend local IP port 3000 or live API URL if remote
  let url = req.url;
  if (url.startsWith('/api/') && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        url = `http://${host}:3000${url}`;
      } else {
        url = `https://crm-rfyq.onrender.com${url}`;
      }
    }
  }


  let authReq = req.clone({ url });

  // Append token if user is authenticated and this is not a login/register request
  if (
    token &&
    !req.url.includes('/auth/login') &&
    !req.url.includes('/auth/register') &&
    !req.url.includes('/auth/refresh')
  ) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Attempt token refresh on 401 Unauthorized (unless it's an auth route already)
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/register') &&
        !req.url.includes('/auth/refresh')
      ) {
        return authService.refreshSession().pipe(
          switchMap(() => {
            const newToken = authService.accessToken;
            const retryReq = authReq.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`
              }
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            // Refresh failed, log out user
            authService.logout().subscribe();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
