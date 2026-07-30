import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
let RoleService = class RoleService {
    http = inject(HttpClient);
    all() {
        return this.http.get('/api/v1/roles');
    }
    one(id) {
        return this.http.get(`/api/v1/roles/${id}`);
    }
    create(role) {
        return this.http.post('/api/v1/roles', role);
    }
    update(id, role) {
        return this.http.patch(`/api/v1/roles/${id}`, role);
    }
    delete(id) {
        return this.http.delete(`/api/v1/roles/${id}`);
    }
    permissionsFor(roleId) {
        return this.http.get(`/api/v1/roles/${roleId}/permissions`);
    }
    setPermissions(roleId, permissionIds) {
        return this.http.patch(`/api/v1/roles/${roleId}/permissions`, { permissionIds });
    }
    allPermissions() {
        return this.http.get('/api/v1/permissions');
    }
};
RoleService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], RoleService);
export { RoleService };
