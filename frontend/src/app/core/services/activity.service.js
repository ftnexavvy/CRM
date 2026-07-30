import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
let ActivityService = class ActivityService {
    http = inject(HttpClient);
    all(limit) {
        let params = new HttpParams();
        if (limit) {
            params = params.set('limit', limit.toString());
        }
        return this.http.get('/api/v1/activity', { params });
    }
};
ActivityService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], ActivityService);
export { ActivityService };
