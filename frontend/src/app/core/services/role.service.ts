import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly http = inject(HttpClient);

  all(): Observable<any> {
    return this.http.get<any>('/api/v1/roles');
  }

  one(id: string): Observable<any> {
    return this.http.get<any>(`/api/v1/roles/${id}`);
  }

  create(role: any): Observable<any> {
    return this.http.post<any>('/api/v1/roles', role);
  }

  update(id: string, role: any): Observable<any> {
    return this.http.patch<any>(`/api/v1/roles/${id}`, role);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`/api/v1/roles/${id}`);
  }

  permissionsFor(roleId: string): Observable<any> {
    return this.http.get<any>(`/api/v1/roles/${roleId}/permissions`);
  }

  setPermissions(roleId: string, permissionIds: string[]): Observable<any> {
    return this.http.patch<any>(`/api/v1/roles/${roleId}/permissions`, { permissionIds });
  }

  allPermissions(): Observable<any> {
    return this.http.get<any>('/api/v1/permissions');
  }
}
