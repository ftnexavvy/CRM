import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
let NotificationService = class NotificationService {
    http = inject(HttpClient);
    all() {
        return this.http.get('/api/v1/notifications');
    }
    markAsRead(id) {
        return this.http.patch(`/api/v1/notifications/${id}/read`, {});
    }
    markAllRead() {
        return this.http.post('/api/v1/notifications/mark-all-read', {});
    }
};
NotificationService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], NotificationService);
export { NotificationService };
