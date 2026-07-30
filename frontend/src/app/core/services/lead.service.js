import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
let LeadService = class LeadService {
    http = inject(HttpClient);
    create(lead) {
        return this.http.post('/api/v1/leads', lead);
    }
    all(status, assignedToId) {
        let params = new HttpParams();
        if (status) {
            params = params.set('status', status);
        }
        if (assignedToId) {
            params = params.set('assignedToId', assignedToId);
        }
        return this.http.get('/api/v1/leads', { params });
    }
    one(id) {
        return this.http.get(`/api/v1/leads/${id}`);
    }
    update(id, lead) {
        return this.http.patch(`/api/v1/leads/${id}`, lead);
    }
    updateStatus(id, status) {
        return this.http.patch(`/api/v1/leads/${id}/status`, { status });
    }
    assign(id, assignedToId) {
        return this.http.patch(`/api/v1/leads/${id}/assign`, { assignedToId });
    }
    convert(id) {
        return this.http.post(`/api/v1/leads/${id}/convert`, {});
    }
    delete(id) {
        return this.http.delete(`/api/v1/leads/${id}`);
    }
};
LeadService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], LeadService);
export { LeadService };
