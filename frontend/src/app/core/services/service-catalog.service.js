import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
let ServiceCatalogService = class ServiceCatalogService {
    http = inject(HttpClient);
    all() {
        return this.http.get('/api/v1/services');
    }
    one(id) {
        return this.http.get(`/api/v1/services/${id}`);
    }
    create(data) {
        return this.http.post('/api/v1/services', data);
    }
    update(id, data) {
        return this.http.patch(`/api/v1/services/${id}`, data);
    }
    delete(id) {
        return this.http.delete(`/api/v1/services/${id}`);
    }
    workflowSettings() {
        return this.http.get('/api/v1/services/workflow/settings');
    }
    updateWorkflowSettings(data) {
        return this.http.patch('/api/v1/services/workflow/settings', data);
    }
};
ServiceCatalogService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], ServiceCatalogService);
export { ServiceCatalogService };
