import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
let UserService = class UserService {
    http = inject(HttpClient);
    all() {
        return this.http.get('/api/v1/users');
    }
    one(id) {
        return this.http.get(`/api/v1/users/${id}`);
    }
    create(user) {
        return this.http.post('/api/v1/users', user);
    }
    update(id, user) {
        return this.http.patch(`/api/v1/users/${id}`, user);
    }
    updateStatus(id, status) {
        return this.http.patch(`/api/v1/users/${id}/status`, { status });
    }
    resetPassword(id, password) {
        return this.http.patch(`/api/v1/users/${id}/reset-password`, { password });
    }
    delete(id) {
        return this.http.delete(`/api/v1/users/${id}`);
    }
};
UserService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], UserService);
export { UserService };
