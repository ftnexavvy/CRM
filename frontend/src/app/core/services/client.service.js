import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
let ClientService = class ClientService {
    http = inject(HttpClient);
    create(client) {
        return this.http.post('/api/v1/clients', client);
    }
    importFromLead(data) {
        return this.http.post('/api/v1/clients/import-from-lead', data);
    }
    all() {
        return this.http.get('/api/v1/clients');
    }
    one(id) {
        return this.http.get(`/api/v1/clients/${id}`);
    }
    update(id, client) {
        return this.http.patch(`/api/v1/clients/${id}`, client);
    }
    delete(id) {
        return this.http.delete(`/api/v1/clients/${id}`);
    }
};
ClientService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], ClientService);
export { ClientService };
