import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
let DepartmentService = class DepartmentService {
    http = inject(HttpClient);
    all() {
        return this.http.get('/api/v1/departments');
    }
    create(department) {
        return this.http.post('/api/v1/departments', department);
    }
    update(id, department) {
        return this.http.patch(`/api/v1/departments/${id}`, department);
    }
};
DepartmentService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], DepartmentService);
export { DepartmentService };
